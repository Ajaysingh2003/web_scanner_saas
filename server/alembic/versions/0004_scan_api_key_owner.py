"""Associate scans with the API key that created them."""

from alembic import op
import sqlalchemy as sa


revision = "0004_scan_api_key_owner"
down_revision = "0003_scanner_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scans", sa.Column("api_key_fingerprint", sa.String(length=24), nullable=True))
    op.create_index("ix_scans_api_key_fingerprint", "scans", ["api_key_fingerprint"])


def downgrade() -> None:
    op.drop_index("ix_scans_api_key_fingerprint", table_name="scans")
    op.drop_column("scans", "api_key_fingerprint")
