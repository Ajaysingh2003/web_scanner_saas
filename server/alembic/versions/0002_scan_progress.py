"""Add durable scanner progress."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_scan_progress"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "scan_progress",
        sa.Column("scan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("scans.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("total_scanners", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_scanners", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_scanners", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_scanner", sa.String(120)),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("scan_progress")
