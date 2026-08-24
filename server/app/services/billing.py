import asyncio
import hmac
import hashlib
import time
from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import ApiKey, BillingAccount, BillingUsage, Project, StripeWebhookEvent, User


PLAN_LIMITS: dict[str, dict[str, int | None]] = {
    "starter": {"projects": 1, "scans_per_month": 10, "api_keys": 1},
    "pro": {"projects": 5, "scans_per_month": 250, "api_keys": 5},
    "max": {"projects": 25, "scans_per_month": None, "api_keys": 25},
}
PLANS = tuple(PLAN_LIMITS)
PLAN_FEATURES: dict[str, tuple[str, ...]] = {
    "starter": ("mcp_server", "full_finding_details", "pdf_export", "remediation_guidance", "active_security_tests"),
    "pro": ("mcp_server", "full_finding_details", "pdf_export", "remediation_guidance", "active_security_tests", "daily_monitoring", "live_threat_detection"),
    "max": ("mcp_server", "full_finding_details", "pdf_export", "remediation_guidance", "active_security_tests", "daily_monitoring", "live_threat_detection", "custom_monitoring", "team_seats", "white_label_reports", "client_workspaces", "commercial_use", "dedicated_support"),
}


def _stripe():
    try:
        import stripe
    except ImportError as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Stripe integration is not installed") from error
    settings = get_settings()
    if not settings.stripe_secret_key.strip():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Stripe is not configured")
    stripe.api_key = settings.stripe_secret_key.strip()
    return stripe


def plan_limits(plan: str) -> dict[str, int | None]:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["starter"])


def plan_features(plan: str) -> tuple[str, ...]:
    return PLAN_FEATURES.get(plan, PLAN_FEATURES["starter"])


async def billing_account(session: AsyncSession, user_id) -> BillingAccount | None:
    return await session.scalar(select(BillingAccount).where(BillingAccount.user_id == user_id))


async def current_plan(session: AsyncSession, user_id) -> str:
    account = await billing_account(session, user_id)
    if account and account.status in {"active", "trialing", "past_due"} and account.plan in PLAN_LIMITS:
        return account.plan
    return "starter"


async def enforce_project_limit(session: AsyncSession, user_id) -> str:
    plan = await current_plan(session, user_id)
    limit = plan_limits(plan)["projects"]
    count = await session.scalar(select(func.count(Project.id)).where(Project.owner_user_id == user_id))
    if limit is not None and int(count or 0) >= limit:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED,
                            f"Your {plan.title()} plan allows {limit} project(s). Upgrade to create another project.")
    return plan


async def enforce_api_key_limit(session: AsyncSession, user_id) -> str:
    plan = await current_plan(session, user_id)
    limit = plan_limits(plan)["api_keys"]
    count = await session.scalar(select(func.count(ApiKey.id)).where(
        ApiKey.user_id == user_id, ApiKey.revoked_at.is_(None)
    ))
    if limit is not None and int(count or 0) >= limit:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED,
                            f"Your {plan.title()} plan allows {limit} active API key(s). Upgrade to create another key.")
    return plan


async def reserve_scan_slot(session: AsyncSession, user_id) -> tuple[str, int | None]:
    plan = await current_plan(session, user_id)
    limit = plan_limits(plan)["scans_per_month"]
    period = datetime.now(timezone.utc).date().replace(day=1)
    usage = await session.scalar(select(BillingUsage).where(
        BillingUsage.user_id == user_id, BillingUsage.period_start == period
    ).with_for_update())
    if usage is None:
        usage = BillingUsage(user_id=user_id, period_start=period, scans_count=0)
        session.add(usage)
        await session.flush()
    if limit is not None and usage.scans_count >= limit:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED,
                            f"Your {plan.title()} plan has reached its {limit}-scan monthly limit.")
    usage.scans_count += 1
    return plan, limit


async def create_checkout_session(session: AsyncSession, user: User, plan: str, interval: str) -> str:
    settings = get_settings()
    if plan not in PLAN_LIMITS or interval not in {"monthly", "annual"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid billing plan or interval")
    price_id = getattr(settings, f"stripe_price_{plan}_{interval}").strip()
    if not price_id:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The requested Stripe price is not configured")
    stripe = _stripe()
    account = await billing_account(session, user.id)
    if account is None:
        account = BillingAccount(user_id=user.id, plan="starter", status="inactive")
        session.add(account)
        await session.flush()
    if account.stripe_subscription_id and account.status in {"active", "trialing", "past_due", "incomplete"}:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "This account already has a Stripe subscription; use the billing portal to change it")
    if account.stripe_customer_id:
        customer_id = account.stripe_customer_id
    else:
        customer = await asyncio.to_thread(stripe.Customer.create, email=user.email, metadata={"user_id": str(user.id)})
        customer_id = customer.id
        account.stripe_customer_id = customer_id
        await session.commit()
    checkout = await asyncio.to_thread(
        stripe.checkout.Session.create,
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=settings.stripe_success_url,
        cancel_url=settings.stripe_cancel_url,
        client_reference_id=str(user.id),
        metadata={"user_id": str(user.id), "plan": plan, "interval": interval},
        subscription_data={"metadata": {"user_id": str(user.id), "plan": plan}},
        allow_promotion_codes=True,
    )
    await session.commit()
    return checkout.url


async def create_portal_session(session: AsyncSession, user_id) -> str:
    settings = get_settings()
    account = await billing_account(session, user_id)
    if not account or not account.stripe_customer_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No Stripe customer is connected to this account")
    stripe = _stripe()
    portal = await asyncio.to_thread(
        stripe.billing_portal.Session.create,
        customer=account.stripe_customer_id,
        return_url=settings.stripe_portal_return_url,
    )
    return portal.url


def verify_webhook(payload: bytes, signature: str, secret: str) -> dict[str, Any]:
    if not secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Stripe webhook secret is not configured")
    values = {}
    for item in signature.split(","):
        key, _, value = item.partition("=")
        values.setdefault(key, []).append(value)
    try:
        timestamp = int(values["t"][0])
        signatures = values["v1"]
    except (KeyError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid Stripe signature")
    if abs(time.time() - timestamp) > 300:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Expired Stripe signature")
    signed = f"{timestamp}.".encode() + payload
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, candidate) for candidate in signatures):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid Stripe signature")
    import json
    try:
        return json.loads(payload)
    except json.JSONDecodeError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid Stripe event payload") from error


def _timestamp(value: Any) -> datetime | None:
    return datetime.fromtimestamp(value, tz=timezone.utc) if value else None


async def process_webhook(session: AsyncSession, event: dict[str, Any]) -> bool:
    event_id = event.get("id")
    event_type = event.get("type", "")
    if not event_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Stripe event ID is missing")
    existing = await session.get(StripeWebhookEvent, event_id)
    if existing and existing.status == "processed":
        return False
    if not existing:
        existing = StripeWebhookEvent(id=event_id, event_type=event_type, payload=event, status="received")
        session.add(existing)
        await session.flush()
    data = event.get("data", {}).get("object", {})
    customer_id = data.get("customer")
    if isinstance(customer_id, dict):
        customer_id = customer_id.get("id")
    account = await session.scalar(select(BillingAccount).where(BillingAccount.stripe_customer_id == customer_id)) if customer_id else None
    if account:
        if event_type == "checkout.session.completed":
            account.stripe_subscription_id = data.get("subscription") or account.stripe_subscription_id
        elif event_type.startswith("customer.subscription."):
            account.stripe_subscription_id = data.get("id") or account.stripe_subscription_id
            account.status = data.get("status", account.status)
            account.current_period_end = _timestamp(data.get("current_period_end"))
            account.cancel_at_period_end = bool(data.get("cancel_at_period_end", False))
            price_id = (((data.get("items") or {}).get("data") or [{}])[0].get("price") or {}).get("id")
            settings = get_settings()
            price_map = {
                settings.stripe_price_starter_monthly: "starter", settings.stripe_price_starter_annual: "starter",
                settings.stripe_price_pro_monthly: "pro", settings.stripe_price_pro_annual: "pro",
                settings.stripe_price_max_monthly: "max", settings.stripe_price_max_annual: "max",
            }
            if event_type == "customer.subscription.deleted":
                account.plan = "starter"
                account.status = "canceled"
            elif price_map.get(price_id) and data.get("status") in {"active", "trialing", "past_due"}:
                account.plan = price_map[price_id]
        elif event_type == "invoice.payment_failed":
            account.status = "past_due"
    existing.status = "processed"
    existing.processed_at = datetime.now(timezone.utc)
    await session.commit()
    return True
