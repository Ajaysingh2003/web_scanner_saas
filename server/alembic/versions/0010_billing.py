"""Add Stripe billing accounts, usage counters, and webhook idempotency."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0010_billing"
down_revision = "0009_otp_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "billing_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stripe_customer_id", sa.String(64)),
        sa.Column("stripe_subscription_id", sa.String(64)),
        sa.Column("plan", sa.String(20), nullable=False, server_default="starter"),
        sa.Column("status", sa.String(30), nullable=False, server_default="inactive"),
        sa.Column("current_period_end", sa.DateTime(timezone=True)),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", name="uq_billing_accounts_user_id"),
        sa.UniqueConstraint("stripe_customer_id", name="uq_billing_accounts_customer_id"),
        sa.UniqueConstraint("stripe_subscription_id", name="uq_billing_accounts_subscription_id"),
    )
    op.create_index("ix_billing_accounts_user_id", "billing_accounts", ["user_id"])
    op.create_index("ix_billing_accounts_stripe_customer_id", "billing_accounts", ["stripe_customer_id"])
    op.create_index("ix_billing_accounts_stripe_subscription_id", "billing_accounts", ["stripe_subscription_id"])
    op.create_table(
        "billing_usage",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("scans_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "period_start", name="uq_billing_usage_user_period"),
    )
    op.create_index("ix_billing_usage_user_id", "billing_usage", ["user_id"])
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("event_type", sa.String(120), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="received"),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("error", sa.Text()),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_stripe_webhook_events_event_type", "stripe_webhook_events", ["event_type"])


def downgrade() -> None:
    op.drop_index("ix_stripe_webhook_events_event_type", table_name="stripe_webhook_events")
    op.drop_table("stripe_webhook_events")
    op.drop_index("ix_billing_usage_user_id", table_name="billing_usage")
    op.drop_table("billing_usage")
    op.drop_index("ix_billing_accounts_stripe_subscription_id", table_name="billing_accounts")
    op.drop_index("ix_billing_accounts_stripe_customer_id", table_name="billing_accounts")
    op.drop_index("ix_billing_accounts_user_id", table_name="billing_accounts")
    op.drop_table("billing_accounts")
