import uuid
from datetime import datetime, timedelta, timezone

import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.api_auth import require_account_user
from app.core.auth import token_hash
from app.core.database import get_session
from app.models import Finding, Project, PublicReportLink, Scan, ScanStatus
from app.schemas.monitoring import (ReportExportOptions, ReportShareCreate, ReportShareListItem,
                                    ReportShareRead)
from app.schemas.scans import ScanRead
from app.services.report_exports import report_markdown, report_pdf
from app.services.billing import current_plan, plan_features
from app.services.scan_diff import compare_scans

router = APIRouter(prefix="/scans", tags=["reports"])
public_router = APIRouter(prefix="/public/reports", tags=["public-reports"])


async def _owned_scan(scan_id: uuid.UUID, request: Request, session: AsyncSession) -> Scan:
    user_id = require_account_user(request)
    scan = await session.scalar(select(Scan).where(Scan.id == scan_id, Scan.owner_user_id == uuid.UUID(user_id)).options(
        selectinload(Scan.findings).selectinload(Finding.retests),
        selectinload(Scan.progress),
        selectinload(Scan.scanner_runs)
    ))
    if not scan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found")
    return scan



async def _previous(scan: Scan, session: AsyncSession) -> Scan | None:
    if not scan.project_id:
        return None
    return await session.scalar(select(Scan).where(
        Scan.project_id == scan.project_id, Scan.url == scan.url,
        Scan.status == ScanStatus.completed, Scan.id != scan.id,
        Scan.finished_at < scan.finished_at if scan.finished_at else True,
    ).options(selectinload(Scan.findings)).order_by(Scan.finished_at.desc()).limit(1))


def _export_response(scan: Scan, options: ReportExportOptions):
    brand = options.brand_name
    if options.format == "pdf":
        return Response(report_pdf(scan, brand, options.accent_color), media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="aetherscan-{scan.id}.pdf"'})
    return Response(report_markdown(scan, brand), media_type="text/markdown",
                    headers={"Content-Disposition": f'attachment; filename="aetherscan-{scan.id}.md"'})


@router.get("/{scan_id}/export")
async def export_scan(scan_id: uuid.UUID, request: Request, options: ReportExportOptions = Depends(),
                      session: AsyncSession = Depends(get_session)):
    scan = await _owned_scan(scan_id, request, session)
    plan = await current_plan(session, scan.owner_user_id)
    if options.format == "pdf" and "pdf_export" not in plan_features(plan):
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "PDF report exports require a paid plan (Starter, Pro, or Max)")
    if options.brand_name and "white_label_reports" not in plan_features(plan):
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "White-label reports require the Max plan")
    if options.format == "json":
        options.format = "markdown"
    return _export_response(scan, options)



@router.get("/{scan_id}/diff")
async def scan_diff(scan_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_session)):
    scan = await _owned_scan(scan_id, request, session)
    previous = await _previous(scan, session)
    return {"scan_id": str(scan.id), "previous_scan_id": str(previous.id) if previous else None,
            "comparison": compare_scans(scan, previous) if previous else None}


@router.get("/projects/{project_id}/scan-history")
async def scan_history(project_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_session), limit: int = 50):
    user_id = uuid.UUID(require_account_user(request))
    project = await session.scalar(select(Project).where(Project.id == project_id, Project.owner_user_id == user_id))
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    from sqlalchemy import desc
    scans = (await session.scalars(select(Scan).where(Scan.project_id == project.id)
             .order_by(desc(Scan.started_at), desc(Scan.finished_at)).limit(min(limit, 200)))).all()
    scans = [scan for scan in scans if not (scan.metadata_ or {}).get("benchmark")]
    return [{"scan_id": str(scan.id), "scan_type": scan.scan_type,
             "scan_scope": (scan.metadata_ or {}).get("scan_scope"),
             "status": scan.status, "score": scan.overall_score,
             "url": scan.url, "started_at": scan.started_at,
             "finished_at": scan.finished_at} for scan in scans]


@router.post("/{scan_id}/share", response_model=ReportShareRead, status_code=status.HTTP_201_CREATED)
async def share_scan(scan_id: uuid.UUID, payload: ReportShareCreate, request: Request,
                     session: AsyncSession = Depends(get_session)):
    scan = await _owned_scan(scan_id, request, session)
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.expires_in_hours) if payload.expires_in_hours else None
    session.add(PublicReportLink(scan_id=scan.id, created_by_user_id=uuid.UUID(require_account_user(request)),
                                 token_hash=token_hash(token), expires_at=expires_at))
    await session.commit()
    return ReportShareRead(url=str(request.base_url).rstrip("/") + "/api/v1/public/reports/" + token, expires_at=expires_at)


@router.get("/{scan_id}/share", response_model=list[ReportShareListItem])
async def list_scan_shares(scan_id: uuid.UUID, request: Request,
                           session: AsyncSession = Depends(get_session)):
    await _owned_scan(scan_id, request, session)
    links = list((await session.scalars(select(PublicReportLink).where(
        PublicReportLink.scan_id == scan_id
    ).order_by(PublicReportLink.created_at.desc()))).all())
    return [ReportShareListItem.model_validate(link) for link in links]


@router.delete("/{scan_id}/share/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share(scan_id: uuid.UUID, link_id: uuid.UUID, request: Request,
                       session: AsyncSession = Depends(get_session)):
    await _owned_scan(scan_id, request, session)
    link = await session.scalar(select(PublicReportLink).where(PublicReportLink.id == link_id, PublicReportLink.scan_id == scan_id))
    if link:
        link.revoked_at = datetime.now(timezone.utc)
        await session.commit()


@public_router.get("/{token}")
async def public_report(token: str, options: ReportExportOptions = Depends(), session: AsyncSession = Depends(get_session)):
    link = await session.scalar(select(PublicReportLink).where(PublicReportLink.token_hash == token_hash(token), PublicReportLink.revoked_at.is_(None)))
    if not link or (link.expires_at and link.expires_at <= datetime.now(timezone.utc)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report link not found or expired")
    scan = await session.scalar(select(Scan).where(Scan.id == link.scan_id).options(
        selectinload(Scan.findings).selectinload(Finding.retests),
        selectinload(Scan.progress),
        selectinload(Scan.scanner_runs)
    ))

    if not scan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    if options.format in {"pdf", "markdown"}:
        return _export_response(scan, options)
    return ScanRead.model_validate(scan).model_dump(mode="json")
