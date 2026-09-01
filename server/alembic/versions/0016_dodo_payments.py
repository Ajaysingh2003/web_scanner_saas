"""Replace Stripe billing identifiers and webhook storage with Dodo Payments."""

from alembic import op


revision = "0016_dodo_payments"
down_revision = "0015_finding_triage_and_retests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("billing_accounts", "stripe_customer_id", new_column_name="dodo_customer_id")
    op.alter_column("billing_accounts", "stripe_subscription_id", new_column_name="dodo_subscription_id")
    op.execute("ALTER TABLE billing_accounts RENAME CONSTRAINT uq_billing_accounts_customer_id TO uq_billing_accounts_dodo_customer_id")
    op.execute("ALTER TABLE billing_accounts RENAME CONSTRAINT uq_billing_accounts_subscription_id TO uq_billing_accounts_dodo_subscription_id")
    op.execute("ALTER INDEX ix_billing_accounts_stripe_customer_id RENAME TO ix_billing_accounts_dodo_customer_id")
    op.execute("ALTER INDEX ix_billing_accounts_stripe_subscription_id RENAME TO ix_billing_accounts_dodo_subscription_id")
    op.rename_table("stripe_webhook_events", "dodo_webhook_events")
    op.execute("ALTER INDEX ix_stripe_webhook_events_event_type RENAME TO ix_dodo_webhook_events_event_type")


def downgrade() -> None:
    op.execute("ALTER INDEX ix_dodo_webhook_events_event_type RENAME TO ix_stripe_webhook_events_event_type")
    op.rename_table("dodo_webhook_events", "stripe_webhook_events")
    op.execute("ALTER INDEX ix_billing_accounts_dodo_customer_id RENAME TO ix_billing_accounts_stripe_customer_id")
    op.execute("ALTER INDEX ix_billing_accounts_dodo_subscription_id RENAME TO ix_billing_accounts_stripe_subscription_id")
    op.execute("ALTER TABLE billing_accounts RENAME CONSTRAINT uq_billing_accounts_dodo_customer_id TO uq_billing_accounts_customer_id")
    op.execute("ALTER TABLE billing_accounts RENAME CONSTRAINT uq_billing_accounts_dodo_subscription_id TO uq_billing_accounts_subscription_id")
    op.alter_column("billing_accounts", "dodo_customer_id", new_column_name="stripe_customer_id")
    op.alter_column("billing_accounts", "dodo_subscription_id", new_column_name="stripe_subscription_id")
