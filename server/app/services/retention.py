import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, delete, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import (
    ApiKey,
    DodoWebhookEvent,
    EmailVerificationToken,
    OtpSession,
    PasswordResetToken,
    ProjectWebhook,
    PublicReportLink,
    RefreshSession,
    Scan,
    ScanStatus,
    UptimeCheck,
    UptimeIncident,
    UptimeMonitor,
)

logger = logging.getLogger(__name__)


async def enforce_data_retention(session: AsyncSession) -> dict[str, int]:
    """Delete expired operational data and remove secrets from disabled integrations."""
    settings = get_settings()
    if not settings.retention_enabled:
        return {"disabled": 1}

    now = datetime.now(timezone.utc)
    scan_cutoff = now - timedelta(days=settings.retention_scan_days)
    auth_cutoff = now - timedelta(days=settings.retention_auth_days)
    webhook_cutoff = now - timedelta(days=settings.retention_payment_webhook_days)
    monitoring_cutoff = now - timedelta(days=settings.retention_monitoring_days)
    integration_cutoff = now - timedelta(days=settings.retention_disabled_integration_days)
    counts: dict[str, int] = {}

    statements = {
        "scans": delete(Scan).where(
            Scan.status.in_([ScanStatus.completed, ScanStatus.failed]),
            or_(
                Scan.finished_at < scan_cutoff,
                and_(Scan.finished_at.is_(None), Scan.started_at < scan_cutoff),
            ),
        ),
        "refresh_sessions": delete(RefreshSession).where(
            or_(
                RefreshSession.expires_at < auth_cutoff,
                RefreshSession.revoked_at < auth_cutoff,
            )
        ),
        "email_verification_tokens": delete(EmailVerificationToken).where(
            EmailVerificationToken.expires_at < auth_cutoff
        ),
        "password_reset_tokens": delete(PasswordResetToken).where(
            PasswordResetToken.expires_at < auth_cutoff
        ),
        "otp_sessions": delete(OtpSession).where(OtpSession.expires_at < auth_cutoff),
        "revoked_api_keys": delete(ApiKey).where(ApiKey.revoked_at < auth_cutoff),
        "payment_webhooks": delete(DodoWebhookEvent).where(
            DodoWebhookEvent.created_at < webhook_cutoff
        ),
        "expired_report_links": delete(PublicReportLink).where(
            or_(
                PublicReportLink.expires_at < auth_cutoff,
                PublicReportLink.revoked_at < auth_cutoff,
            )
        ),
        "uptime_checks": delete(UptimeCheck).where(UptimeCheck.checked_at < monitoring_cutoff),
        "resolved_incidents": delete(UptimeIncident).where(
            UptimeIncident.resolved_at < monitoring_cutoff
        ),
        "disabled_project_webhooks": delete(ProjectWebhook).where(
            ProjectWebhook.enabled.is_(False),
            ProjectWebhook.updated_at < integration_cutoff,
        ),
    }

    for name, statement in statements.items():
        result = await session.execute(statement)
        counts[name] = max(0, int(result.rowcount or 0))

    scrubbed = await session.execute(
        update(UptimeMonitor)
        .where(
            UptimeMonitor.enabled.is_(False),
            UptimeMonitor.updated_at < integration_cutoff,
            or_(
                UptimeMonitor.alert_webhook_secret_encrypted.is_not(None),
                UptimeMonitor.public_token_hash.is_not(None),
            ),
        )
        .values(
            alert_webhook_url=None,
            alert_webhook_secret_encrypted=None,
            public_token_hash=None,
        )
    )
    counts["disabled_monitor_secrets"] = max(0, int(scrubbed.rowcount or 0))

    await session.commit()
    logger.info("retention_cleanup_completed", extra={"deleted": counts})
    return counts
