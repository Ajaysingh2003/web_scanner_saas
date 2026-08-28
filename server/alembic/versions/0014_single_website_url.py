"""Replace project environments with one canonical website URL."""

from alembic import op
import sqlalchemy as sa


revision = "0014_single_website_url"
down_revision = "0013_project_integrations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("projects", "production_url", new_column_name="website_url")
    op.drop_column("projects", "staging_url")
    op.drop_column("projects", "preview_url")
    op.drop_column("projects", "schedule_environment")


def downgrade() -> None:
    op.add_column("projects", sa.Column("staging_url", sa.String(2048), nullable=True))
    op.add_column("projects", sa.Column("preview_url", sa.String(2048), nullable=True))
    op.add_column("projects", sa.Column("schedule_environment", sa.String(20), nullable=False, server_default="production"))
    op.alter_column("projects", "schedule_environment", server_default=None)
    op.alter_column("projects", "website_url", new_column_name="production_url")
    op.alter_column("projects", "production_url", nullable=False)
