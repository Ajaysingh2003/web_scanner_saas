import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.api_auth import require_account_user
from app.core.auth import token_hash
from app.core.database import get_session
from app.core.secrets import encrypt_secret
from app.models import Project, UptimeCheck, UptimeIncident, UptimeMonitor
from app.schemas.monitoring import (UptimeCheckRead, UptimeIncidentRead, UptimeMonitorCreate,
                                    UptimeMonitorRead)
from app.core.responses import ApiResponse, success_response

router = APIRouter(prefix="/projects", tags=["uptime"])
public_router = APIRouter(prefix="/public", tags=["public-status"])


async def _owned(project_id: uuid.UUID, request: Request, session: AsyncSession) -> Project:
    user_id = require_account_user(request)
    project = await session.scalar(select(Project).where(
        Project.id == project_id, Project.owner_user_id == uuid.UUID(user_id)
    ))
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


def _read(monitor: UptimeMonitor, request: Request | None = None) -> UptimeMonitorRead:
    return UptimeMonitorRead(
        id=monitor.id, project_id=monitor.project_id, url=monitor.url, enabled=monitor.enabled,
        interval_seconds=monitor.interval_seconds, timeout_seconds=monitor.timeout_seconds,
        status=monitor.status, last_status_code=monitor.last_status_code,
        last_response_ms=monitor.last_response_ms, last_checked_at=monitor.last_checked_at,
        consecutive_failures=monitor.consecutive_failures,
        consecutive_successes=monitor.consecutive_successes, public_status_url=None,
    )


@router.post("/{project_id}/uptime", response_model=ApiResponse[UptimeMonitorRead], status_code=status.HTTP_201_CREATED)
async def create_uptime(project_id: uuid.UUID, payload: UptimeMonitorCreate, request: Request,
                        session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, request, session)
    existing = await session.scalar(select(UptimeMonitor).where(UptimeMonitor.project_id == project.id))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "This project already has an uptime monitor")
    public_token = secrets.token_urlsafe(32)
    monitor = UptimeMonitor(
        project_id=project.id, url=str(payload.url), interval_seconds=payload.interval_seconds,
        timeout_seconds=payload.timeout_seconds, public_token_hash=token_hash(public_token),
        alert_webhook_url=str(payload.alert_webhook_url) if payload.alert_webhook_url else None,
        alert_webhook_secret_encrypted=(encrypt_secret(payload.alert_webhook_secret.get_secret_value())
                                        if payload.alert_webhook_secret else None),
    )
    session.add(monitor)
    await session.commit()
    await session.refresh(monitor)
    data = _read(monitor, request)
    data.public_status_url = str(request.base_url).rstrip("/") + "/api/v1/public/status/" + public_token
    return success_response(request, "Uptime monitor created successfully", data)


@router.get("/{project_id}/uptime", response_model=ApiResponse[UptimeMonitorRead])
async def get_uptime(project_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, request, session)
    monitor = await session.scalar(select(UptimeMonitor).where(UptimeMonitor.project_id == project.id))
    if not monitor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Uptime monitor not found")
    return success_response(request, "Uptime monitor retrieved successfully", _read(monitor, request))


@router.get("/{project_id}/uptime/checks", response_model=ApiResponse[list[UptimeCheckRead]])
async def uptime_checks(project_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_session), limit: int = 100):
    project = await _owned(project_id, request, session)
    monitor = await session.scalar(select(UptimeMonitor).where(UptimeMonitor.project_id == project.id))
    if not monitor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Uptime monitor not found")
    checks = (await session.scalars(select(UptimeCheck).where(UptimeCheck.monitor_id == monitor.id)
              .order_by(UptimeCheck.checked_at.desc()).limit(min(limit, 500)))).all()
    return success_response(request, "Uptime checks retrieved successfully",
                            [UptimeCheckRead.model_validate(check) for check in checks], len(checks))


@router.get("/{project_id}/uptime/incidents", response_model=ApiResponse[list[UptimeIncidentRead]])
async def uptime_incidents(project_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_session)):
    project = await _owned(project_id, request, session)
    monitor = await session.scalar(select(UptimeMonitor).where(UptimeMonitor.project_id == project.id))
    if not monitor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Uptime monitor not found")
    incidents = (await session.scalars(select(UptimeIncident).where(UptimeIncident.monitor_id == monitor.id)
                 .order_by(UptimeIncident.started_at.desc()).limit(100))).all()
    return success_response(request, "Uptime incidents retrieved successfully",
                            [UptimeIncidentRead.model_validate(item) for item in incidents], len(incidents))


@public_router.get("/status/{token}")
async def public_status(token: str, session: AsyncSession = Depends(get_session)):
    monitor = await session.scalar(select(UptimeMonitor).where(
        UptimeMonitor.public_token_hash == token_hash(token), UptimeMonitor.enabled
    ))
    if not monitor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Status page not found")
    return {"status": "operational" if monitor.status == "up" else monitor.status,
            "last_checked_at": monitor.last_checked_at, "response_ms": monitor.last_response_ms,
            "incident": monitor.status == "down"}
