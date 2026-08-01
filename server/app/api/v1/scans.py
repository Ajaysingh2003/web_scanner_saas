import asyncio
import uuid

from arq import ArqRedis
from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_session
from app.core.database import SessionFactory
from app.core.api_auth import api_key_fingerprint, is_valid_api_key, presented_api_key, require_api_key
from app.core.config import get_settings
from app.models import (Finding, Scan, ScanProgress, ScanStatus, ScannerRun,
                        ScannerRunStatus, Severity)
from app.schemas.scans import FindingRead, ScanCreate, ScanRead
from app.scanners.registry import get_scanners

router = APIRouter(prefix="/scans", tags=["scans"])

@router.post("", response_model=ScanRead, status_code=status.HTTP_202_ACCEPTED)
async def create_scan(payload: ScanCreate, request: Request, session: AsyncSession = Depends(get_session)):
    owner = require_api_key(request)
    scanners = get_scanners()
    scan = Scan(
        url=str(payload.url),
        api_key_fingerprint=owner,
        status=ScanStatus.queued,
        metadata_={},
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


@router.get("", response_model=list[ScanRead])
async def list_scans(request: Request, session: AsyncSession = Depends(get_session), limit: int = Query(20, le=100)):
    owner = require_api_key(request)
    query = select(Scan).options(selectinload(Scan.findings), selectinload(Scan.progress),
                                 selectinload(Scan.scanner_runs))
    if owner:
        query = query.where(Scan.api_key_fingerprint == owner)
    query = query.order_by(Scan.started_at.desc().nulls_last()).limit(limit)
    return list((await session.scalars(query)).all())


@router.get("/{scan_id}", response_model=ScanRead)
async def get_scan(scan_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_session)):
    owner = require_api_key(request)
    scan = (await session.scalars(select(Scan).options(selectinload(Scan.findings), selectinload(Scan.progress),
                                                       selectinload(Scan.scanner_runs)).where(Scan.id == scan_id).where(
                                                           Scan.api_key_fingerprint == owner if owner else True))).first()
    if not scan:
        raise HTTPException(404, "Scan not found")
    return scan


@router.get("/{scan_id}/findings", response_model=list[FindingRead])
async def list_findings(scan_id: uuid.UUID, request: Request, severity: Severity | None = None, session: AsyncSession = Depends(get_session)):
    owner = require_api_key(request)
    query = select(Finding).join(Scan).where(Finding.scan_id == scan_id)
    if owner:
        query = query.where(Scan.api_key_fingerprint == owner)
    if severity:
        query = query.where(Finding.severity == severity)
    return list((await session.scalars(query.order_by(Finding.id))).all())


@router.websocket("/{scan_id}/events")
async def scan_events(websocket: WebSocket, scan_id: uuid.UUID):
    settings = get_settings()
    api_key = presented_api_key(websocket)
    owner = api_key_fingerprint(api_key or "") if settings.api_key_enabled and is_valid_api_key(api_key, settings) else None
    if settings.api_key_enabled and owner is None:
        await websocket.close(code=1008, reason="A valid API key is required")
        return
    await websocket.accept()
    try:
        while True:
            async with SessionFactory() as session:
                scan = (await session.scalars(
                    select(Scan).options(selectinload(Scan.progress)).where(Scan.id == scan_id).where(
                        Scan.api_key_fingerprint == owner if owner else True)
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
