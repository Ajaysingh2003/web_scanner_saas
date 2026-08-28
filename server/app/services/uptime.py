import time
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.secrets import decrypt_secret
from app.models import Project, UptimeCheck, UptimeIncident, UptimeMonitor
from app.services.webhooks import send_webhook


async def check_monitor(session: AsyncSession, monitor: UptimeMonitor) -> None:
    started = time.perf_counter()
    status_code = None
    error = None
    is_up = False
    try:
        async with httpx.AsyncClient(timeout=monitor.timeout_seconds, follow_redirects=True) as client:
            response = await client.get(monitor.url)
        status_code = response.status_code
        is_up = 200 <= status_code < 400
        if not is_up:
            error = f"HTTP {status_code}"
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"[:500]
    response_ms = round((time.perf_counter() - started) * 1000)
    previous_status = monitor.status
    now = datetime.now(timezone.utc)
    monitor.last_checked_at = now
    monitor.last_status_code = status_code
    monitor.last_response_ms = response_ms
    monitor.status = "up" if is_up else "down"
    if is_up:
        monitor.consecutive_successes += 1
        monitor.consecutive_failures = 0
    else:
        monitor.consecutive_failures += 1
        monitor.consecutive_successes = 0
    session.add(UptimeCheck(monitor_id=monitor.id, checked_at=now, is_up=is_up,
                            status_code=status_code, response_ms=response_ms, error=error))
    incident = await session.scalar(select(UptimeIncident).where(
        UptimeIncident.monitor_id == monitor.id, UptimeIncident.status == "open"
    ).order_by(UptimeIncident.started_at.desc()))
    alert_event = None
    if not is_up and previous_status != "down":
        incident = UptimeIncident(monitor_id=monitor.id, status="open", failure_count=1, last_error=error)
        session.add(incident)
        alert_event = "uptime.down"
    elif not is_up and incident:
        incident.failure_count += 1
        incident.last_error = error
    elif is_up and previous_status == "down" and incident:
        incident.status = "resolved"
        incident.resolved_at = now
        incident.recovery_count += 1
        alert_event = "uptime.recovered"
    await session.flush()
    if alert_event and monitor.alert_webhook_url and monitor.alert_webhook_secret_encrypted:
        await send_webhook(monitor.alert_webhook_url, decrypt_secret(monitor.alert_webhook_secret_encrypted),
                           alert_event, str(monitor.id), {
                               "monitor_id": str(monitor.id), "project_id": str(monitor.project_id),
                               "url": monitor.url, "status": monitor.status, "status_code": status_code,
                               "response_ms": response_ms, "error": error,
                           })
