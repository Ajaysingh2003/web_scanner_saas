"""Create scans and findings."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    scan_status = postgresql.ENUM("queued", "running", "completed", "failed", name="scanstatus", create_type=False)
    severity = postgresql.ENUM("critical", "high", "medium", "low", "info", name="severity", create_type=False)
    scan_status.create(op.get_bind(), checkfirst=True); severity.create(op.get_bind(), checkfirst=True)
    op.create_table("scans", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("url", sa.String(2048), nullable=False), sa.Column("status", scan_status, nullable=False), sa.Column("overall_score", sa.Float()), sa.Column("started_at", sa.DateTime(timezone=True)), sa.Column("finished_at", sa.DateTime(timezone=True)), sa.Column("metadata", sa.JSON(), nullable=False))
    op.create_index("ix_scans_status", "scans", ["status"])
    op.create_table("findings", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("scan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("scans.id", ondelete="CASCADE"), nullable=False), sa.Column("scanner_name", sa.String(120), nullable=False), sa.Column("category", sa.String(40), nullable=False), sa.Column("severity", severity, nullable=False), sa.Column("title", sa.String(240), nullable=False), sa.Column("description", sa.Text(), nullable=False), sa.Column("evidence", sa.JSON(), nullable=False), sa.Column("remediation", sa.Text(), nullable=False), sa.Column("confidence", sa.Float(), nullable=False), sa.Column("raw_data", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_findings_scan_id", "findings", ["scan_id"])

def downgrade():
    op.drop_table("findings"); op.drop_table("scans")
    sa.Enum(name="severity").drop(op.get_bind(), checkfirst=True); sa.Enum(name="scanstatus").drop(op.get_bind(), checkfirst=True)
