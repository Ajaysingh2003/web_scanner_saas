"""Add scan type for isolated security tests."""

from alembic import op
import sqlalchemy as sa


revision = "0008_scan_type"
down_revision = "0007_supabase_connections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scans", sa.Column("scan_type", sa.String(40), nullable=False, server_default="full"))


def downgrade() -> None:
    op.drop_column("scans", "scan_type")
