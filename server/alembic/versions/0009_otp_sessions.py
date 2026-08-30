"""Add OTP sessions for authentication security tests."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0009_otp_sessions"
down_revision = "0008_scan_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "otp_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("scans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("otp_encrypted", sa.Text()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("submitted_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_otp_sessions_scan_id", "otp_sessions", ["scan_id"])
    op.create_index("ix_otp_sessions_project_id", "otp_sessions", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_otp_sessions_project_id", table_name="otp_sessions")
    op.drop_index("ix_otp_sessions_scan_id", table_name="otp_sessions")
    op.drop_table("otp_sessions")
