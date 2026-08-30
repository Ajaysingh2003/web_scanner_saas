"""Add encrypted Supabase project connections."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0007_supabase_connections"
down_revision = "0006_projects"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "supabase_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_url", sa.String(2048), nullable=False),
        sa.Column("anon_key_encrypted", sa.Text(), nullable=False),
        sa.Column("service_role_key_encrypted", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", name="uq_supabase_connections_project"),
    )
    op.create_index("ix_supabase_connections_project_id", "supabase_connections", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_supabase_connections_project_id", table_name="supabase_connections")
    op.drop_table("supabase_connections")
