import asyncio
import json
import uuid

from arq import ArqRedis
from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from pydantic import AnyHttpUrl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_session
from app.core.database import SessionFactory
from app.core.api_auth import (api_key_fingerprint, authenticate_credential, is_valid_api_key,
                               presented_api_key, require_identity)
from app.core.auth import decode_access_token
from app.core.config import get_settings
from app.models import (Finding, FindingRetest, Project, Scan, ScanProgress, ScanStatus, ScannerRun,
                        ScannerRunStatus, Severity)
from app.models import SupabaseConnection
from app.schemas.scans import (FindingRead, FindingRetestRead, FindingRetestResponse,
                               FindingTriageUpdate, ScanCreate, ScanRead, SqlInjectionScanCreate,
                               XssScanCreate, ExtendedUrlScanCreate)
from app.schemas.scans import RobotsCrawlRead, RobotsCrawlRequest
from app.services.robots_crawl import run_robots_crawl
from app.services.scoring import score_breakdown
from app.services.retest import perform_single_finding_retest
from app.core.secrets import encrypt_secret
from app.scanners.registry import get_scanners, get_security_test_scanners
from app.schemas.auth_scans import AuthenticationScanCreate
from app.services.billing import current_plan, reserve_scan_slot

router = APIRouter(prefix="/scans", tags=["scans"])
robots_crawl_router = APIRouter(prefix="/scans", tags=["robots-crawl"])
security_tests_router = APIRouter(prefix="/projects", tags=["security-tests"])
extended_security_router = APIRouter(prefix="/scans/security", tags=["extended-security"])

EXTENDED_SCAN_TYPES = {
    "github_sast", "dependencies", "firebase", "tenant_isolation", "audit_logging",
    "ddos_resilience", "mobile_api", "hosting_security",
}


def _refresh_score_for_response(scan: Scan) -> None:
    if scan.status not in (ScanStatus.completed, ScanStatus.failed):
        return
    failed_scanners = sum(run.status == ScannerRunStatus.failed for run in scan.scanner_runs)
    breakdown = score_breakdown(
        scan.findings,
        {run.category for run in scan.scanner_runs},
        failed_scanners,
    )
    scan.overall_score = breakdown["overall_score"]
    scan.metadata_ = {**(scan.metadata_ or {}), "scoring": breakdown}


async def _robots_crawl(url: str, request: Request, session: AsyncSession) -> RobotsCrawlRead:
    identity = require_identity(request)
    if identity["user_id"]:
        await reserve_scan_slot(session, uuid.UUID(identity["user_id"]))
        await session.commit()
    result = await run_robots_crawl(url)
    result["findings"] = [
        {
            "scanner_name": "robots_crawl",
            "category": "seo",
            "severity": finding.severity,
            "title": finding.title,
            "description": finding.description,
            "evidence": finding.evidence,
            "remediation": finding.remediation,
            "confidence": finding.confidence,
        }
        for finding in result["findings"]
    ]
    return RobotsCrawlRead.model_validate(result)

@extended_security_router.post("/{scan_type}", response_model=ScanRead,
                               status_code=status.HTTP_202_ACCEPTED)
async def create_extended_url_scan(scan_type: str, payload: ExtendedUrlScanCreate,
                                   request: Request, session: AsyncSession = Depends(get_session)):
    if scan_type not in EXTENDED_SCAN_TYPES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown extended security scan type")
    if scan_type in {"github_sast", "dependencies"} and not payload.repository_url:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "repository_url is required for repository-based scanning")
    if scan_type == "tenant_isolation" and (not payload.tenant_test_mode or not payload.tenant):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "tenant_test_mode and two authorized tenant actors are required")
    identity = require_identity(request)
    if not identity["user_id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "A user credential is required")
    project = None
    if payload.project_id:
        project = await session.scalar(select(Project).where(
            Project.id == payload.project_id,
            Project.owner_user_id == uuid.UUID(identity["user_id"]),
        ))
        if not project:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
        if identity["project_id"] and uuid.UUID(identity["project_id"]) != project.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Project API key cannot access another project")
    await reserve_scan_slot(session, uuid.UUID(identity["user_id"]))
    integration = {
        "repository_url": str(payload.repository_url) if payload.repository_url else None,
        "firebase_project_url": str(payload.firebase_project_url) if payload.firebase_project_url else None,
        "tenant_test_mode": payload.tenant_test_mode,
    }
    if payload.github_token:
        integration["github_token"] = payload.github_token.get_secret_value()
    if payload.firebase_access_token:
        integration["firebase_access_token"] = payload.firebase_access_token.get_secret_value()
    if payload.firebase_api_key:
        integration["firebase_api_key"] = payload.firebase_api_key.get_secret_value()
    for field in ("vercel_project_id", "netlify_site_id", "cloudflare_zone_id"):
        value = getattr(payload, field)
        if value:
            integration[field] = value
    for field in ("vercel_token", "netlify_token", "cloudflare_api_token"):
        value = getattr(payload, field)
        if value:
            integration[field] = value.get_secret_value()
    if payload.tenant:
        integration["tenant"] = {
            "login_url": payload.tenant.login_url,
            "identifier_selector": payload.tenant.identifier_selector,
            "password_selector": payload.tenant.password_selector,
            "submit_selector": payload.tenant.submit_selector,
            "actor_a": {
                "identifier": payload.tenant.actor_a.identifier,
                "password": payload.tenant.actor_a.password.get_secret_value(),
            },
            "actor_b": {
                "identifier": payload.tenant.actor_b.identifier,
                "password": payload.tenant.actor_b.password.get_secret_value(),
            },
            "resource_paths": payload.tenant.resource_paths,
        }
    scanners = get_security_test_scanners(scan_type)
    scan = Scan(
        url=str(payload.url),
        scan_type=scan_type,
        owner_user_id=uuid.UUID(identity["user_id"]),
        project_id=project.id if project else None,
        environment="production" if project else None,
        api_key_id=identity["api_key_id"],
        api_key_fingerprint=identity["api_key_fingerprint"],
        status=ScanStatus.queued,
        metadata_={
            "security_test": {
                "scan_type": scan_type,
                "authorized": True,
                "integration_encrypted": encrypt_secret(json.dumps(integration)),
                "integration_configured": bool(
                    payload.repository_url or payload.firebase_project_url or payload.tenant_test_mode
                    or payload.vercel_token or payload.netlify_token or payload.cloudflare_api_token
                ),
            },
            "authorization_confirmed": True,
        },
        progress=ScanProgress(total_scanners=len(scanners)),
        scanner_runs=[ScannerRun(scanner_name=scanner.name, category=scanner.category,
                                 status=ScannerRunStatus.queued) for scanner in scanners],
    )
    session.add(scan)
    await session.commit()
    await session.refresh(scan)
    await session.refresh(scan, attribute_names=["findings", "progress", "scanner_runs"])
    redis: ArqRedis | None = getattr(request.app.state, "redis", None)
    if redis:
        await redis.enqueue_job("run_scan", str(scan.id))
    return scan


@robots_crawl_router.post("/robots-crawl", response_model=RobotsCrawlRead)
async def robots_crawl(payload: RobotsCrawlRequest, request: Request, session: AsyncSession = Depends(get_session)):
    return await _robots_crawl(str(payload.url), request, session)


@robots_crawl_router.get("/robots-crawl", response_model=RobotsCrawlRead)
async def robots_crawl_read(url: AnyHttpUrl, request: Request, session: AsyncSession = Depends(get_session)):
    return await _robots_crawl(str(url), request, session)

@router.post("", response_model=ScanRead, status_code=status.HTTP_202_ACCEPTED)
async def create_scan(payload: ScanCreate, request: Request, session: AsyncSession = Depends(get_session)):
    identity = require_identity(request)
    project_id = uuid.UUID(identity["project_id"]) if identity["project_id"] else payload.project_id
    project = None
    if project_id:
        if not identity["user_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "A user-owned project is required")
        project = await session.scalar(select(Project).where(
            Project.id == project_id, Project.owner_user_id == uuid.UUID(identity["user_id"])))
        if not project:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
        if identity["project_id"] and payload.project_id and payload.project_id != project_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Project API key cannot access another project")
    target = str(payload.url) if payload.url else None
    if not target and project:
        target = project.website_url
        if not target:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "No website URL is configured for this project")
    if not target:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No scan target is configured")
    if identity["user_id"]:
        await reserve_scan_slot(session, uuid.UUID(identity["user_id"]))
    has_supabase = bool(project and await session.scalar(
        select(SupabaseConnection.id).where(SupabaseConnection.project_id == project.id)
    ))
    scanners = get_scanners(include_supabase=has_supabase)
    if payload.scanner_categories:
        allowed_categories = set(payload.scanner_categories)
        scanners = [scanner for scanner in scanners if scanner.category in allowed_categories]
        if not scanners:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "At least one valid scanner category is required")
    scan = Scan(
        url=target,
        scan_type=payload.scan_type,
        owner_user_id=uuid.UUID(identity["user_id"]) if identity["user_id"] else None,
        project_id=project.id if project else None,
        environment="website" if project else None,
        api_key_id=identity["api_key_id"],
        api_key_fingerprint=identity["api_key_fingerprint"],
        status=ScanStatus.queued,
        metadata_={
            "project_settings": project.settings or {},
            "scanner_categories": payload.scanner_categories,
            "scan_scope": "full" if payload.scan_type == "full" else ",".join(payload.scanner_categories or []),
        } if project else {},
        progress=ScanProgress(total_scanners=len(scanners)),
        scanner_runs=[ScannerRun(scanner_name=scanner.name, category=scanner.category,
                                 status=ScannerRunStatus.queued) for scanner in scanners],
    )
    session.add(scan)
    await session.commit()
    await session.refresh(scan)
    await session.refresh(scan, attribute_names=["findings"])
    await session.refresh(scan, attribute_names=["progress"])
    await session.refresh(scan, attribute_names=["scanner_runs"])
    redis: ArqRedis | None = getattr(request.app.state, "redis", None)
    if redis:
        await redis.enqueue_job("run_scan", str(scan.id))
    return scan


@security_tests_router.post("/{project_id}/security-scans/sql-injection", response_model=ScanRead,
                            status_code=status.HTTP_202_ACCEPTED)
async def create_sql_injection_scan(project_id: uuid.UUID, payload: SqlInjectionScanCreate,
                                    request: Request, session: AsyncSession = Depends(get_session)):
    identity = require_identity(request)
    if not identity["user_id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "A user or project API credential is required")
    if identity["project_id"] and uuid.UUID(identity["project_id"]) != project_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Project API key cannot access another project")
    project = await session.scalar(select(Project).where(
        Project.id == project_id, Project.owner_user_id == uuid.UUID(identity["user_id"])))
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    target = project.website_url
    if not target:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No website URL is configured for this project",
        )
    await reserve_scan_slot(session, uuid.UUID(identity["user_id"]))
    scanners = get_security_test_scanners("sql_injection")
    scan = Scan(
        url=target,
        scan_type="sql_injection",
        owner_user_id=uuid.UUID(identity["user_id"]),
        project_id=project.id,
        environment="website",
        api_key_id=identity["api_key_id"],
        api_key_fingerprint=identity["api_key_fingerprint"],
        status=ScanStatus.queued,
        metadata_={
            "security_test": payload.model_dump(exclude={"authorized"}),
            "authorization_confirmed": True,
        },
        progress=ScanProgress(total_scanners=len(scanners)),
        scanner_runs=[ScannerRun(scanner_name=scanner.name, category=scanner.category,
                                 status=ScannerRunStatus.queued) for scanner in scanners],
    )
    session.add(scan)
    await session.commit()
    await session.refresh(scan)
    await session.refresh(scan, attribute_names=["findings", "progress", "scanner_runs"])
    redis: ArqRedis | None = getattr(request.app.state, "redis", None)
    if redis:
        await redis.enqueue_job("run_scan", str(scan.id))
    return scan


@security_tests_router.post("/{project_id}/security-scans/xss", response_model=ScanRead,
                            status_code=status.HTTP_202_ACCEPTED)
async def create_xss_scan(project_id: uuid.UUID, payload: XssScanCreate,
                          request: Request, session: AsyncSession = Depends(get_session)):
    identity = require_identity(request)
    if not identity["user_id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "A user or project API credential is required")
    if identity["project_id"] and uuid.UUID(identity["project_id"]) != project_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Project API key cannot access another project")
    project = await session.scalar(select(Project).where(
        Project.id == project_id, Project.owner_user_id == uuid.UUID(identity["user_id"])))
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    target = project.website_url
    if not target:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No website URL is configured for this project",
        )
    await reserve_scan_slot(session, uuid.UUID(identity["user_id"]))
    scanners = get_security_test_scanners("xss_active")
    scan = Scan(
        url=target,
        scan_type="xss_active",
        owner_user_id=uuid.UUID(identity["user_id"]),
        project_id=project.id,
        environment="website",
        api_key_id=identity["api_key_id"],
        api_key_fingerprint=identity["api_key_fingerprint"],
        status=ScanStatus.queued,
        metadata_={
            "security_test": payload.model_dump(exclude={"authorized"}),
            "authorization_confirmed": True,
        },
        progress=ScanProgress(total_scanners=len(scanners)),
        scanner_runs=[ScannerRun(scanner_name=scanner.name, category=scanner.category,
                                 status=ScannerRunStatus.queued) for scanner in scanners],
    )
    session.add(scan)
    await session.commit()
    await session.refresh(scan)
    await session.refresh(scan, attribute_names=["findings", "progress", "scanner_runs"])
    redis: ArqRedis | None = getattr(request.app.state, "redis", None)
    if redis:
        await redis.enqueue_job("run_scan", str(scan.id))
    return scan


@security_tests_router.post("/{project_id}/security-scans/authentication", response_model=ScanRead,
                            status_code=status.HTTP_202_ACCEPTED)
async def create_authentication_scan(project_id: uuid.UUID, payload: AuthenticationScanCreate,
                                     request: Request, session: AsyncSession = Depends(get_session)):
    try:
        payload.validate_request()
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error
    identity = require_identity(request)
    if not identity["user_id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "A user or project API credential is required")
    if identity["project_id"] and uuid.UUID(identity["project_id"]) != project_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Project API key cannot access another project")
    project = await session.scalar(select(Project).where(
        Project.id == project_id, Project.owner_user_id == uuid.UUID(identity["user_id"])))
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    target = project.website_url
    if not target:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No website URL is configured for this project")
    await reserve_scan_slot(session, uuid.UUID(identity["user_id"]))
    scanners = get_security_test_scanners("authentication_flow")
    account = payload.test_account.model_dump()
    if account.get("password"):
        account["password"] = payload.test_account.password.get_secret_value()
    flow = payload.flow.model_dump()
    redacted_flow = {
        **flow,
        "steps": [
            {
                **step,
                "value": "[redacted]" if step.get("value") is not None else None,
            }
            for step in flow["steps"]
        ],
    }
    scan = Scan(
        url=target,
        scan_type="authentication_flow",
        owner_user_id=uuid.UUID(identity["user_id"]),
        project_id=project.id,
        environment="website",
        api_key_id=identity["api_key_id"],
        api_key_fingerprint=identity["api_key_fingerprint"],
        status=ScanStatus.queued,
        metadata_={"security_test": {
            "scan_id": "pending",
            "project_id": str(project.id),
            "flow": redacted_flow,
            "flow_encrypted": encrypt_secret(json.dumps(flow)),
            "webhook_url": str(payload.webhook_url),
            "webhook_secret_encrypted": encrypt_secret(payload.webhook_secret.get_secret_value()),
            "test_account_encrypted": encrypt_secret(json.dumps(account)),
            "rate_limit_probe_encrypted": encrypt_secret(json.dumps({
                **payload.rate_limit_probe.model_dump(exclude={"wrong_password"}),
                "wrong_password": payload.rate_limit_probe.wrong_password.get_secret_value()
                if payload.rate_limit_probe.wrong_password else None,
            })),
            "include_password_reset": payload.include_password_reset,
        }},
        progress=ScanProgress(total_scanners=len(scanners)),
        scanner_runs=[ScannerRun(scanner_name=scanner.name, category=scanner.category,
                                 status=ScannerRunStatus.queued) for scanner in scanners],
    )
    session.add(scan)
    await session.flush()
    scan.metadata_ = {
        **scan.metadata_,
        "security_test": {**scan.metadata_["security_test"], "scan_id": str(scan.id)},
    }
    await session.commit()
    await session.refresh(scan)
    await session.refresh(scan, attribute_names=["findings", "progress", "scanner_runs"])
    redis: ArqRedis | None = getattr(request.app.state, "redis", None)
    if redis:
        await redis.enqueue_job("run_scan", str(scan.id))
    return scan


@router.get("", response_model=list[ScanRead])
async def list_scans(request: Request, session: AsyncSession = Depends(get_session), limit: int = Query(20, le=100)):
    identity = require_identity(request)
    query = select(Scan).options(
        selectinload(Scan.findings).selectinload(Finding.retests),
        selectinload(Scan.progress),
        selectinload(Scan.scanner_runs),
    )

    if identity["project_id"]:
        query = query.where(Scan.project_id == uuid.UUID(identity["project_id"]))
    elif identity["user_id"]:
        query = query.where(Scan.owner_user_id == uuid.UUID(identity["user_id"]))
    elif identity["api_key_fingerprint"]:
        query = query.where(Scan.api_key_fingerprint == identity["api_key_fingerprint"])
    query = query.order_by(Scan.started_at.desc().nulls_last()).limit(limit)
    scans = list((await session.scalars(query)).all())
    for scan in scans:
        _refresh_score_for_response(scan)
    return scans


@router.get("/{scan_id}", response_model=ScanRead)
async def get_scan(scan_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_session)):
    identity = require_identity(request)
    ownership = (Scan.project_id == uuid.UUID(identity["project_id"])) if identity["project_id"] else (
        Scan.owner_user_id == uuid.UUID(identity["user_id"]) if identity["user_id"] else (
            Scan.api_key_fingerprint == identity["api_key_fingerprint"] if identity["api_key_fingerprint"] else True))
    scan = (await session.scalars(select(Scan).options(
        selectinload(Scan.findings).selectinload(Finding.retests),
        selectinload(Scan.progress),
        selectinload(Scan.scanner_runs),
    ).where(Scan.id == scan_id).where(ownership))).first()
    if not scan:
        raise HTTPException(404, "Scan not found")
    _refresh_score_for_response(scan)
    if identity["user_id"] and await current_plan(session, uuid.UUID(identity["user_id"])) == "free":
        read = ScanRead.model_validate(scan)
        read.findings = read.findings[:1]
        return read

    return scan


@router.get("/{scan_id}/findings", response_model=list[FindingRead])
async def list_findings(scan_id: uuid.UUID, request: Request, severity: Severity | None = None, session: AsyncSession = Depends(get_session)):
    identity = require_identity(request)
    query = select(Finding).join(Scan).options(selectinload(Finding.retests)).where(Finding.scan_id == scan_id)
    if identity["project_id"]:
        query = query.where(Scan.project_id == uuid.UUID(identity["project_id"]))
    elif identity["user_id"]:
        query = query.where(Scan.owner_user_id == uuid.UUID(identity["user_id"]))
    elif identity["api_key_fingerprint"]:
        query = query.where(Scan.api_key_fingerprint == identity["api_key_fingerprint"])
    if severity:
        query = query.where(Finding.severity == severity)
    return list((await session.scalars(query.order_by(Finding.id))).all())


@router.patch("/{scan_id}/findings/{finding_id}/triage", response_model=FindingRead)
async def update_finding_triage(
    scan_id: uuid.UUID,
    finding_id: int,
    payload: FindingTriageUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    identity = require_identity(request)
    ownership = (Scan.project_id == uuid.UUID(identity["project_id"])) if identity["project_id"] else (
        Scan.owner_user_id == uuid.UUID(identity["user_id"]) if identity["user_id"] else (
            Scan.api_key_fingerprint == identity["api_key_fingerprint"] if identity["api_key_fingerprint"] else True))
    scan = (await session.scalars(select(Scan).where(Scan.id == scan_id).where(ownership))).first()
    if not scan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found")
    finding = (await session.scalars(
        select(Finding).options(selectinload(Finding.retests)).where(
            Finding.id == finding_id, Finding.scan_id == scan_id
        )
    )).first()
    if not finding:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Finding not found")

    from datetime import datetime, timezone
    user_id = uuid.UUID(identity["user_id"]) if identity["user_id"] else None
    finding.triage_status = payload.triage_status
    if payload.triage_note is not None:
        finding.triage_note = payload.triage_note
    finding.triaged_at = datetime.now(timezone.utc)
    finding.triaged_by_user_id = user_id

    await session.commit()
    await session.refresh(finding)
    return finding


@router.post("/{scan_id}/findings/{finding_id}/retest", response_model=FindingRetestResponse)
async def retest_single_finding(
    scan_id: uuid.UUID,
    finding_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    identity = require_identity(request)
    ownership = (Scan.project_id == uuid.UUID(identity["project_id"])) if identity["project_id"] else (
        Scan.owner_user_id == uuid.UUID(identity["user_id"]) if identity["user_id"] else (
            Scan.api_key_fingerprint == identity["api_key_fingerprint"] if identity["api_key_fingerprint"] else True))
    scan = (await session.scalars(select(Scan).where(Scan.id == scan_id).where(ownership))).first()
    if not scan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found")
    finding = (await session.scalars(
        select(Finding).options(selectinload(Finding.retests)).where(
            Finding.id == finding_id, Finding.scan_id == scan_id
        )
    )).first()
    if not finding:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Finding not found")

    user_id = uuid.UUID(identity["user_id"]) if identity["user_id"] else None
    retest_result = await perform_single_finding_retest(finding, scan, user_id, session)

    return FindingRetestResponse(
        finding_id=finding.id,
        retest_status=retest_result.status,
        triage_status=finding.triage_status,
        http_status_code=retest_result.http_status_code,
        response_time_ms=retest_result.response_time_ms,
        message=retest_result.message,
        tested_at=retest_result.created_at,
        evidence=retest_result.evidence,
    )


@router.get("/{scan_id}/findings/{finding_id}/retests", response_model=list[FindingRetestRead])
async def list_finding_retests(
    scan_id: uuid.UUID,
    finding_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    identity = require_identity(request)
    ownership = (Scan.project_id == uuid.UUID(identity["project_id"])) if identity["project_id"] else (
        Scan.owner_user_id == uuid.UUID(identity["user_id"]) if identity["user_id"] else (
            Scan.api_key_fingerprint == identity["api_key_fingerprint"] if identity["api_key_fingerprint"] else True))
    scan = (await session.scalars(select(Scan).where(Scan.id == scan_id).where(ownership))).first()
    if not scan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found")
    retests = list((await session.scalars(
        select(FindingRetest).where(
            FindingRetest.finding_id == finding_id, FindingRetest.scan_id == scan_id
        ).order_by(FindingRetest.created_at.desc())
    )).all())
    return retests



@router.websocket("/{scan_id}/events")
async def scan_events(websocket: WebSocket, scan_id: uuid.UUID):
    settings = get_settings()
    api_key = presented_api_key(websocket)
    authenticated = False
    if api_key:
        authenticated = await authenticate_credential(api_key, websocket.scope, settings)
        if not authenticated and (user_id := decode_access_token(api_key)):
            websocket.scope["user_id"] = user_id
            authenticated = True
        if not authenticated and is_valid_api_key(api_key, settings):
            websocket.scope["api_key_fingerprint"] = api_key_fingerprint(api_key)
            authenticated = True
    if settings.api_key_enabled and not authenticated:
        await websocket.close(code=1008, reason="A valid API key is required")
        return
    owner_user_id = uuid.UUID(websocket.scope["user_id"]) if websocket.scope.get("user_id") else None
    owner_project_id = uuid.UUID(websocket.scope["project_id"]) if websocket.scope.get("project_id") else None
    owner_fingerprint = websocket.scope.get("api_key_fingerprint")
    await websocket.accept()
    try:
        while True:
            async with SessionFactory() as session:
                scan = (await session.scalars(
                    select(Scan).options(selectinload(Scan.progress)).where(Scan.id == scan_id).where(
                        Scan.project_id == owner_project_id if owner_project_id else (
                            Scan.owner_user_id == owner_user_id if owner_user_id else (
                                Scan.api_key_fingerprint == owner_fingerprint if owner_fingerprint else True)))
                )).first()
            if scan is None:
                await websocket.close(code=1008, reason="Scan not found")
                return
            progress = scan.progress
            await websocket.send_json({
                "scan_id": str(scan.id),
                "status": scan.status.value,
                "overall_score": scan.overall_score,
                "progress": {
                    "total_scanners": progress.total_scanners if progress else 0,
                    "completed_scanners": progress.completed_scanners if progress else 0,
                    "failed_scanners": progress.failed_scanners if progress else 0,
                    "current_scanner": progress.current_scanner if progress else None,
                },
            })
            if scan.status in (ScanStatus.completed, ScanStatus.failed):
                return
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
