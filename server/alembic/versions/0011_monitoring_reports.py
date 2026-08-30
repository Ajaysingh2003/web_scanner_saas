"""Add uptime monitoring, incidents, and public report links."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0011_monitoring_reports"
down_revision = "0010_billing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("uptime_monitors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("interval_seconds", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("timeout_seconds", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("alert_webhook_url", sa.String(2048)),
        sa.Column("alert_webhook_secret_encrypted", sa.Text()),
        sa.Column("public_token_hash", sa.String(64), unique=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="unknown"),
        sa.Column("last_status_code", sa.Integer()),
        sa.Column("last_response_ms", sa.Integer()),
        sa.Column("last_checked_at", sa.DateTime(timezone=True)),
        sa.Column("consecutive_failures", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consecutive_successes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", name="uq_uptime_monitors_project_id"),
    )
    op.create_index("ix_uptime_monitors_project_id", "uptime_monitors", ["project_id"])
    op.create_index("ix_uptime_monitors_public_token_hash", "uptime_monitors", ["public_token_hash"])
    op.create_table("uptime_checks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("monitor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("uptime_monitors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("is_up", sa.Boolean(), nullable=False),
        sa.Column("status_code", sa.Integer()),
        sa.Column("response_ms", sa.Integer()),
        sa.Column("error", sa.String(500)),
    )
    op.create_index("ix_uptime_checks_monitor_id", "uptime_checks", ["monitor_id"])
    op.create_index("ix_uptime_checks_checked_at", "uptime_checks", ["checked_at"])
    op.create_table("uptime_incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("monitor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("uptime_monitors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("failure_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("recovery_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.String(500)),
    )
    op.create_index("ix_uptime_incidents_monitor_id", "uptime_incidents", ["monitor_id"])
    op.create_table("public_report_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("scans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("token_hash", name="uq_public_report_links_token_hash"),
    )
    op.create_index("ix_public_report_links_scan_id", "public_report_links", ["scan_id"])
    op.create_index("ix_public_report_links_token_hash", "public_report_links", ["token_hash"])
    op.create_index("ix_public_report_links_created_by_user_id", "public_report_links", ["created_by_user_id"])


def downgrade() -> None:
    op.drop_index("ix_public_report_links_created_by_user_id", table_name="public_report_links")
    op.drop_index("ix_public_report_links_token_hash", table_name="public_report_links")
    op.drop_index("ix_public_report_links_scan_id", table_name="public_report_links")
    op.drop_table("public_report_links")
    op.drop_index("ix_uptime_incidents_monitor_id", table_name="uptime_incidents")
    op.drop_table("uptime_incidents")
    op.drop_index("ix_uptime_checks_checked_at", table_name="uptime_checks")
    op.drop_index("ix_uptime_checks_monitor_id", table_name="uptime_checks")
    op.drop_table("uptime_checks")
    op.drop_index("ix_uptime_monitors_project_id", table_name="uptime_monitors")
    op.drop_index("ix_uptime_monitors_public_token_hash", table_name="uptime_monitors")
    op.drop_table("uptime_monitors")
