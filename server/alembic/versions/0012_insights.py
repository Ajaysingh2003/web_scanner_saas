"""Add paid competitor benchmarks and ROI profiles."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0012_insights"
down_revision = "0011_monitoring_reports"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "competitor_benchmarks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("score", sa.Float()),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("last_scan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("scans.id", ondelete="SET NULL")),
        sa.Column("last_scanned_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "url", name="uq_competitor_project_url"),
    )
    op.create_index("ix_competitor_benchmarks_project_id", "competitor_benchmarks", ["project_id"])
    op.create_table(
        "roi_profiles",
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("monthly_sessions", sa.Integer(), nullable=False, server_default="10000"),
        sa.Column("average_order_value", sa.Float(), nullable=False, server_default="100"),
        sa.Column("conversion_rate", sa.Float(), nullable=False, server_default="2"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("lcp_delay_seconds", sa.Float(), nullable=False, server_default="1.2"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("roi_profiles")
    op.drop_index("ix_competitor_benchmarks_project_id", table_name="competitor_benchmarks")
    op.drop_table("competitor_benchmarks")
