"""Add finding triage fields and finding_retests table."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "0015_finding_triage_and_retests"
down_revision = "0014_single_website_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("findings", sa.Column("triage_status", sa.String(length=32), nullable=False, server_default="open"))
    op.add_column("findings", sa.Column("triage_note", sa.Text(), nullable=True))
    op.add_column("findings", sa.Column("triaged_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("findings", sa.Column("triaged_by_user_id", UUID(as_uuid=True), nullable=True))
    op.add_column("findings", sa.Column("last_retested_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_findings_triaged_by_user_id", "findings", "users", ["triaged_by_user_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_findings_triage_status", "findings", ["triage_status"])
    op.create_index("ix_findings_triaged_by_user_id", "findings", ["triaged_by_user_id"])

    op.create_table(
        "finding_retests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("finding_id", sa.Integer(), nullable=False),
        sa.Column("scan_id", UUID(as_uuid=True), nullable=False),
        sa.Column("retested_by_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("http_status_code", sa.Integer(), nullable=True),
        sa.Column("response_time_ms", sa.Float(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("evidence", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["finding_id"], ["findings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["scan_id"], ["scans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["retested_by_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_finding_retests_finding_id", "finding_retests", ["finding_id"])
    op.create_index("ix_finding_retests_scan_id", "finding_retests", ["scan_id"])
    op.create_index("ix_finding_retests_status", "finding_retests", ["status"])
    op.create_index("ix_finding_retests_retested_by_user_id", "finding_retests", ["retested_by_user_id"])


def downgrade() -> None:
    op.drop_table("finding_retests")
    op.drop_index("ix_findings_triaged_by_user_id", table_name="findings")
    op.drop_index("ix_findings_triage_status", table_name="findings")
    op.drop_constraint("fk_findings_triaged_by_user_id", "findings", type_="foreignkey")
    op.drop_column("findings", "last_retested_at")
    op.drop_column("findings", "triaged_by_user_id")
    op.drop_column("findings", "triaged_at")
    op.drop_column("findings", "triage_note")
    op.drop_column("findings", "triage_status")
