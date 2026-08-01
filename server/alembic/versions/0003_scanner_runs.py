"""Record each scanner execution outcome."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_scanner_runs"
down_revision = "0002_scan_progress"
branch_labels = None
depends_on = None


def upgrade():
    scanner_status = postgresql.ENUM("queued", "running", "completed", "failed",
                                     name="scannerrunstatus", create_type=False)
    scanner_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "scanner_runs",
        sa.Column("scan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("scans.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("scanner_name", sa.String(120), primary_key=True),
        sa.Column("category", sa.String(40), nullable=False),
        sa.Column("status", scanner_status, nullable=False),
        sa.Column("findings_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error", sa.Text()),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
    )
    op.execute("""
        INSERT INTO scan_progress (scan_id, total_scanners, completed_scanners, failed_scanners)
        SELECT id, 9, CASE WHEN status IN ('completed', 'failed') THEN 9 ELSE 0 END, 0
        FROM scans
        ON CONFLICT (scan_id) DO UPDATE SET total_scanners = GREATEST(scan_progress.total_scanners, 9)
    """)


def downgrade():
    op.drop_table("scanner_runs")
    sa.Enum(name="scannerrunstatus").drop(op.get_bind(), checkfirst=True)
