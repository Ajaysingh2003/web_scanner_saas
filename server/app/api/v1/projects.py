import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from arq import ArqRedis
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.api_auth import require_account_user
from app.core.auth import token_hash
from app.core.database import get_session
from app.models import (ApiKey, BillingUsage, CompetitorBenchmark, Project, RoiProfile,
                        Scan, ScanProgress, ScannerRun, ScannerRunStatus, Severity,
                        SupabaseConnection)
from app.schemas.auth import ApiKeyCreated, ApiKeyRead
from app.core.responses import ApiResponse, success_response
from app.schemas.projects import ProjectApiKeyCreate, ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.supabase import SupabaseConnectionCreate, SupabaseConnectionRead
from app.schemas.overview import (OverviewFinding, OverviewProject, OverviewScan,
                                   ProjectOverview)
from app.schemas.insights import (CompetitorRead, CompetitorUpdate, RoiInput, RoiRead)
from app.core.secrets import encrypt_secret
from app.services.billing import (current_plan, enforce_api_key_limit, enforce_project_limit,
                                  plan_limits)
from app.scanners.registry import get_scanners

router = APIRouter(prefix="/projects", tags=["projects"])


async def _require_paid(user_id: str, session: AsyncSession) -> str:
    plan = await current_plan(session, uuid.UUID(user_id))
    if plan not in {"pro", "max"}:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED,
                            "Competitor benchmarks and ROI insights require a Pro or Max plan")
    return plan


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:80] or "project"


def _read(project: Project) -> ProjectRead:
    return ProjectRead(id=project.id, name=project.name, slug=project.slug,
                       production_url=project.production_url, staging_url=project.staging_url,
                       preview_url=project.preview_url, settings=project.settings or {},
                       schedule_enabled=project.schedule_enabled,
                       schedule_interval_minutes=project.schedule_interval_minutes,
                       schedule_environment=project.schedule_environment,
                       schedule_next_run_at=project.schedule_next_run_at,
                       created_at=project.created_at, updated_at=project.updated_at)


def _supabase_read(connection: SupabaseConnection) -> SupabaseConnectionRead:
    return SupabaseConnectionRead(
        id=connection.id,
        project_id=connection.project_id,
        project_url=connection.project_url,
        anon_key_configured=bool(connection.anon_key_encrypted),
        service_role_key_configured=bool(connection.service_role_key_encrypted),
        created_at=connection.created_at,
        updated_at=connection.updated_at,
    )


async def _owned(project_id: uuid.UUID, user_id: str, session: AsyncSession) -> Project:
    project = await session.scalar(select(Project).where(Project.id == project_id,
                                                         Project.owner_user_id == uuid.UUID(user_id)))
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


@router.get("/{project_id}/overview", response_model=ApiResponse[ProjectOverview])
async def project_overview(project_id: uuid.UUID, request: Request,
                           session: AsyncSession = Depends(get_session)):
    user_id = require_account_user(request)
    project = await _owned(project_id, user_id, session)
    plan = await current_plan(session, uuid.UUID(user_id))
    scans = list((await session.scalars(
        select(Scan).options(selectinload(Scan.findings)).where(Scan.project_id == project.id)
        .order_by(desc(Scan.started_at), desc(Scan.finished_at)).limit(25)
    )).all())
    latest = next((candidate for candidate in scans if not (candidate.metadata_ or {}).get("benchmark")), None)
    severity_counts = {severity.value: 0 for severity in Severity}
    category_scores: dict[str, float] = {}
    visible_findings: list[OverviewFinding] = []
    total_findings = 0
    risk_level = "not_scanned"
    score = None
    if latest:
        score = latest.overall_score
        total_findings = len(latest.findings)
        for finding in latest.findings:
            severity_counts[finding.severity.value] += 1
        scoring = (latest.metadata_ or {}).get("scoring") or {}
        category_scores = scoring.get("category_scores") or {}
        if "domain" not in category_scores and "infrastructure" in category_scores:
            category_scores = {**category_scores, "domain": category_scores["infrastructure"]}
        if severity_counts[Severity.critical.value]:
            risk_level = "critical"
        elif severity_counts[Severity.high.value]:
            risk_level = "high"
        elif severity_counts[Severity.medium.value]:
            risk_level = "medium"
        elif severity_counts[Severity.low.value]:
            risk_level = "low"
        else:
            risk_level = "informational"
        ordered = sorted(latest.findings, key=lambda item: (
            {Severity.critical: 5, Severity.high: 4, Severity.medium: 3,
             Severity.low: 2, Severity.info: 1}[item.severity], item.confidence
        ), reverse=True)
        preview_limit = None if plan in {"pro", "max"} else 1
        for finding in ordered[:preview_limit]:
            visible_findings.append(OverviewFinding(
                id=finding.id, category=finding.category, severity=finding.severity.value,
                title=finding.title, description=finding.description,
            ))
    locked_findings = max(0, total_findings - len(visible_findings))
    limits = plan_limits(plan)
    usage_limit = limits["scans_per_month"]
    usage = await session.scalar(select(BillingUsage).where(
        BillingUsage.user_id == uuid.UUID(user_id),
        BillingUsage.period_start == datetime.now(timezone.utc).date().replace(day=1),
    ))
    scan_limit_reached = usage_limit is not None and bool(usage and usage.scans_count >= usage_limit)
    setup = {
        "production_url_configured": bool(project.production_url),
        "staging_url_configured": bool(project.staging_url),
        "preview_url_configured": bool(project.preview_url),
        "schedule_enabled": project.schedule_enabled,
        "schedule_environment": project.schedule_environment,
    }
    data = ProjectOverview(
        project=OverviewProject(id=project.id, name=project.name,
                                production_url=project.production_url,
                                staging_url=project.staging_url, preview_url=project.preview_url),
        plan=plan, latest_scan=OverviewScan(
            id=latest.id, status=latest.status.value, score=latest.overall_score,
            url=latest.url, environment=latest.environment,
            started_at=latest.started_at, finished_at=latest.finished_at,
        ) if latest else None,
        score=score, risk_level=risk_level, total_findings=total_findings,
        severity_counts=severity_counts, category_scores=category_scores,
        findings=visible_findings, locked_findings=locked_findings,
        has_scan=latest is not None, scan_available=not scan_limit_reached,
        scan_limit_reached=scan_limit_reached, setup=setup,
    )
    return success_response(request, "Project overview retrieved successfully", data)


def _competitor_read(item: CompetitorBenchmark) -> CompetitorRead:
    return CompetitorRead(id=item.id, label=item.label, url=item.url, score=item.score,
                          status=item.status,
                          last_scanned_at=item.last_scanned_at.isoformat() if item.last_scanned_at else None)


@router.get("/{project_id}/benchmarks", response_model=ApiResponse[list[CompetitorRead]])
async def list_benchmarks(project_id: uuid.UUID, request: Request,
                          session: AsyncSession = Depends(get_session)):
    user_id = require_account_user(request)
    await _require_paid(user_id, session)
    project = await _owned(project_id, user_id, session)
    items = list((await session.scalars(select(CompetitorBenchmark).where(
        CompetitorBenchmark.project_id == project.id).order_by(CompetitorBenchmark.created_at))).all())
    return success_response(request, "Competitor benchmarks retrieved successfully",
                            [_competitor_read(item) for item in items], len(items))


@router.put("/{project_id}/benchmarks", response_model=ApiResponse[list[CompetitorRead]])
async def replace_benchmarks(project_id: uuid.UUID, payload: CompetitorUpdate, request: Request,
                             session: AsyncSession = Depends(get_session)):
    user_id = require_account_user(request)
    await _require_paid(user_id, session)
    project = await _owned(project_id, user_id, session)
    existing = list((await session.scalars(select(CompetitorBenchmark).where(
        CompetitorBenchmark.project_id == project.id))).all())
    requested = {str(item.url).rstrip("/"): item for item in payload.competitors}
    for item in existing:
        if item.url not in requested:
            await session.delete(item)
    redis: ArqRedis | None = getattr(request.app.state, "redis", None)
    scanners = get_scanners()
    result: list[CompetitorBenchmark] = []
    for url, input_item in requested.items():
        item = next((candidate for candidate in existing if candidate.url == url), None)
        if item is None:
            item = CompetitorBenchmark(project_id=project.id, label=input_item.label, url=url, status="queued")
            session.add(item)
            await session.flush()
            scan = Scan(url=url, owner_user_id=uuid.UUID(user_id), project_id=project.id,
                        environment="production", scan_type="benchmark", status="queued",
                        metadata_={"benchmark_id": str(item.id), "benchmark": True},
                        progress=ScanProgress(total_scanners=len(scanners)),
                        scanner_runs=[ScannerRun(scanner_name=scanner.name, category=scanner.category,
                                                 status=ScannerRunStatus.queued) for scanner in scanners])
            session.add(scan)
            await session.flush()
            item.last_scan_id = scan.id
            if redis:
                await redis.enqueue_job("run_scan", str(scan.id))
        else:
            item.label = input_item.label
        result.append(item)
    await session.commit()
    return success_response(request, "Competitor benchmarks saved and queued for analysis",
                            [_competitor_read(item) for item in result], len(result))


@router.get("/{project_id}/roi", response_model=ApiResponse[RoiRead])
async def get_roi(project_id: uuid.UUID, request: Request,
                  session: AsyncSession = Depends(get_session)):
    user_id = require_account_user(request)
    await _require_paid(user_id, session)
    project = await _owned(project_id, user_id, session)
    profile = await session.get(RoiProfile, project.id)
    if profile is None:
        profile = RoiProfile(project_id=project.id)
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
    return success_response(request, "ROI profile retrieved successfully", _roi_read(profile))


def _roi_read(profile: RoiProfile) -> RoiRead:
    loss = min(25.0, round(profile.lcp_delay_seconds * 2.833, 2))
    monthly_revenue = profile.monthly_sessions * (profile.conversion_rate / 100) * profile.average_order_value
    return RoiRead(monthly_sessions=profile.monthly_sessions,
                   average_order_value=profile.average_order_value,
                   conversion_rate=profile.conversion_rate, currency=profile.currency,
                   lcp_delay_seconds=profile.lcp_delay_seconds,
                   estimated_conversion_loss_percent=loss,
                   estimated_monthly_revenue_at_risk=round(monthly_revenue * loss / 100, 2))


@router.put("/{project_id}/roi", response_model=ApiResponse[RoiRead])
async def update_roi(project_id: uuid.UUID, payload: RoiInput, request: Request,
                     session: AsyncSession = Depends(get_session)):
    user_id = require_account_user(request)
    await _require_paid(user_id, session)
    project = await _owned(project_id, user_id, session)
    profile = await session.get(RoiProfile, project.id)
    if profile is None:
        profile = RoiProfile(project_id=project.id)
        session.add(profile)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value.upper() if field == "currency" else value)
    await session.commit()
    await session.refresh(profile)
    return success_response(request, "ROI profile updated successfully", _roi_read(profile))


@router.post("", response_model=ApiResponse[ProjectRead], status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, request: Request, session: AsyncSession = Depends(get_session)):
    user_id = require_account_user(request)
    await enforce_project_limit(session, uuid.UUID(user_id))
    slug = _slug(payload.name)
    if await session.scalar(select(Project).where(Project.owner_user_id == uuid.UUID(user_id), Project.slug == slug)):
        slug = f"{slug}-{secrets.token_hex(3)}"
    now = datetime.now(timezone.utc)
    project = Project(
        owner_user_id=uuid.UUID(user_id), name=payload.name, slug=slug,
        production_url=str(payload.production_url), staging_url=str(payload.staging_url) if payload.staging_url else None,
        preview_url=str(payload.preview_url) if payload.preview_url else None,
        settings=payload.settings.model_dump(), schedule_enabled=payload.schedule_enabled,
        schedule_interval_minutes=payload.schedule_interval_minutes,
        schedule_environment=payload.schedule_environment,
        schedule_next_run_at=now + timedelta(minutes=payload.schedule_interval_minutes) if payload.schedule_enabled else None,
    )
    if project.schedule_enabled and not getattr(project, f"{project.schedule_environment}_url", None):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The scheduled environment must have a configured URL")
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return success_response(request, "Project created successfully", _read(project))


@router.get("", response_model=ApiResponse[list[ProjectRead]])
async def list_projects(request: Request, session: AsyncSession = Depends(get_session)):
    user_id = require_account_user(request)
    projects = (await session.scalars(select(Project).where(Project.owner_user_id == uuid.UUID(user_id))
                 .order_by(Project.created_at.desc()))).all()
    return success_response(request, "Projects retrieved successfully", [_read(project) for project in projects], len(projects))


@router.get("/{project_id}", response_model=ApiResponse[ProjectRead])
async def get_project(project_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_session)):
    return success_response(request, "Project retrieved successfully", _read(await _owned(project_id, require_account_user(request), session)))


@router.patch("/{project_id}", response_model=ApiResponse[ProjectRead])
async def update_project(project_id: uuid.UUID, payload: ProjectUpdate, request: Request,
                         session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, require_account_user(request), session)
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes:
        project.name = changes["name"]
        project.slug = _slug(changes["name"])
    for field in ("production_url", "staging_url", "preview_url"):
        if field in changes:
            value = changes[field]
            setattr(project, field, str(value) if value else None)
    if "settings" in changes and changes["settings"] is not None:
        project.settings = payload.settings.model_dump()
    if "schedule_interval_minutes" in changes:
        project.schedule_interval_minutes = changes["schedule_interval_minutes"]
    if "schedule_environment" in changes:
        project.schedule_environment = changes["schedule_environment"]
    if "schedule_enabled" in changes:
        project.schedule_enabled = changes["schedule_enabled"]
    if project.schedule_enabled and ("schedule_enabled" in changes or "schedule_interval_minutes" in changes or "schedule_environment" in changes):
        project.schedule_next_run_at = datetime.now(timezone.utc) + timedelta(minutes=project.schedule_interval_minutes)
    elif not project.schedule_enabled:
        project.schedule_next_run_at = None
    if project.schedule_enabled and not getattr(project, f"{project.schedule_environment}_url", None):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The scheduled environment must have a configured URL")
    await session.commit()
    await session.refresh(project)
    return success_response(request, "Project updated successfully", _read(project))


@router.delete("/{project_id}", response_model=ApiResponse[None])
async def delete_project(project_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, require_account_user(request), session)
    await session.delete(project)
    await session.commit()
    return success_response(request, "Project deleted successfully")


@router.post("/{project_id}/api-keys", response_model=ApiResponse[ApiKeyCreated], status_code=status.HTTP_201_CREATED)
async def create_project_api_key(project_id: uuid.UUID, payload: ProjectApiKeyCreate, request: Request,
                                 session: AsyncSession = Depends(get_session)):
    user_id = require_account_user(request)
    project = await _owned(project_id, user_id, session)
    await enforce_api_key_limit(session, uuid.UUID(user_id))
    key_id = secrets.token_urlsafe(12)[:18]
    secret = secrets.token_urlsafe(32)
    key = ApiKey(user_id=project.owner_user_id, project_id=project.id, key_id=key_id,
                 name=payload.name, secret_hash=token_hash(secret))
    session.add(key)
    await session.commit()
    created = ApiKeyCreated(id=str(key.id), key_id=key.key_id, name=key.name, created_at=key.created_at,
                         last_used_at=key.last_used_at, revoked_at=key.revoked_at,
                         secret=f"ask_live_{key_id}_{secret}")
    return success_response(request, "Project API key created successfully; store the secret now because it will not be shown again", created)


@router.get("/{project_id}/api-keys", response_model=ApiResponse[list[ApiKeyRead]])
async def list_project_api_keys(project_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, require_account_user(request), session)
    keys = (await session.scalars(select(ApiKey).where(ApiKey.project_id == project.id)
             .order_by(ApiKey.created_at.desc()))).all()
    data = [ApiKeyRead(id=str(key.id), key_id=key.key_id, name=key.name, created_at=key.created_at,
                       last_used_at=key.last_used_at, revoked_at=key.revoked_at) for key in keys]
    return success_response(request, "Project API keys retrieved successfully", data, len(data))


@router.delete("/{project_id}/api-keys/{key_id}", response_model=ApiResponse[None])
async def revoke_project_api_key(project_id: uuid.UUID, key_id: str, request: Request,
                                 session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, require_account_user(request), session)
    key = await session.scalar(select(ApiKey).where(ApiKey.project_id == project.id, ApiKey.key_id == key_id))
    if key:
        key.revoked_at = datetime.now(timezone.utc)
        await session.commit()
    return success_response(request, "Project API key revoked successfully")


@router.post("/{project_id}/supabase", response_model=ApiResponse[SupabaseConnectionRead],
             status_code=status.HTTP_201_CREATED)
async def connect_supabase(project_id: uuid.UUID, payload: SupabaseConnectionCreate, request: Request,
                           session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, require_account_user(request), session)
    existing = await session.scalar(
        select(SupabaseConnection).where(SupabaseConnection.project_id == project.id)
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "This project already has a Supabase connection")
    connection = SupabaseConnection(
        project_id=project.id,
        project_url=str(payload.project_url).rstrip("/"),
        anon_key_encrypted=encrypt_secret(payload.anon_key.get_secret_value()),
        service_role_key_encrypted=(
            encrypt_secret(payload.service_role_key.get_secret_value())
            if payload.service_role_key else None
        ),
    )
    session.add(connection)
    await session.commit()
    await session.refresh(connection)
    return success_response(request, "Supabase connection created successfully", _supabase_read(connection))


@router.put("/{project_id}/supabase", response_model=ApiResponse[SupabaseConnectionRead])
async def replace_supabase(project_id: uuid.UUID, payload: SupabaseConnectionCreate, request: Request,
                            session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, require_account_user(request), session)
    connection = await session.scalar(
        select(SupabaseConnection).where(SupabaseConnection.project_id == project.id)
    )
    if connection is None:
        connection = SupabaseConnection(project_id=project.id)
        session.add(connection)
    connection.project_url = str(payload.project_url).rstrip("/")
    connection.anon_key_encrypted = encrypt_secret(payload.anon_key.get_secret_value())
    connection.service_role_key_encrypted = (
        encrypt_secret(payload.service_role_key.get_secret_value())
        if payload.service_role_key else None
    )
    await session.commit()
    await session.refresh(connection)
    return success_response(request, "Supabase connection replaced successfully", _supabase_read(connection))


@router.get("/{project_id}/supabase", response_model=ApiResponse[SupabaseConnectionRead])
async def get_supabase(project_id: uuid.UUID, request: Request,
                       session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, require_account_user(request), session)
    connection = await session.scalar(
        select(SupabaseConnection).where(SupabaseConnection.project_id == project.id)
    )
    if connection is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supabase is not connected to this project")
    return success_response(request, "Supabase connection retrieved successfully", _supabase_read(connection))


@router.delete("/{project_id}/supabase", response_model=ApiResponse[None])
async def disconnect_supabase(project_id: uuid.UUID, request: Request,
                              session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, require_account_user(request), session)
    connection = await session.scalar(
        select(SupabaseConnection).where(SupabaseConnection.project_id == project.id)
    )
    if connection is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supabase is not connected to this project")
    await session.delete(connection)
    await session.commit()
    return success_response(request, "Supabase disconnected successfully")
