"""Add project webhooks and provider connections."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0013_project_integrations"
down_revision = "0012_insights"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_webhooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("secret_encrypted", sa.Text(), nullable=False),
        sa.Column("events", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_project_webhooks_project_id", "project_webhooks", ["project_id"])
    op.create_table(
        "provider_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("configuration_encrypted", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "provider", name="uq_provider_connections_project_provider"),
    )
    op.create_index("ix_provider_connections_project_id", "provider_connections", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_provider_connections_project_id", table_name="provider_connections")
    op.drop_table("provider_connections")
    op.drop_index("ix_project_webhooks_project_id", table_name="project_webhooks")
    op.drop_table("project_webhooks")
