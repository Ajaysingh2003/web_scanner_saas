"""Add projects, project-scoped API keys, and scan environments."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0006_projects"
down_revision = "0005_user_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("production_url", sa.String(2048), nullable=False),
        sa.Column("staging_url", sa.String(2048)),
        sa.Column("preview_url", sa.String(2048)),
        sa.Column("settings", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("schedule_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("schedule_interval_minutes", sa.Integer(), nullable=False, server_default="1440"),
        sa.Column("schedule_environment", sa.String(20), nullable=False, server_default="production"),
        sa.Column("schedule_next_run_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("owner_user_id", "slug", name="uq_projects_owner_slug"),
    )
    op.create_index("ix_projects_owner_user_id", "projects", ["owner_user_id"])
    op.add_column("api_keys", sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE")))
    op.create_index("ix_api_keys_project_id", "api_keys", ["project_id"])
    op.add_column("scans", sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL")))
    op.add_column("scans", sa.Column("environment", sa.String(20)))
    op.create_index("ix_scans_project_id", "scans", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_scans_project_id", table_name="scans")
    op.drop_column("scans", "environment")
    op.drop_column("scans", "project_id")
    op.drop_index("ix_api_keys_project_id", table_name="api_keys")
    op.drop_column("api_keys", "project_id")
    op.drop_column("projects", "schedule_environment")
    op.drop_index("ix_projects_owner_user_id", table_name="projects")
    op.drop_table("projects")
