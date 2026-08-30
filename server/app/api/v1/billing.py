import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.api_auth import require_account_user
from app.core.config import get_settings
from app.core.database import get_session
from app.models import BillingUsage, User
from app.schemas.billing import (BillingAccountRead, BillingPlanRead, CheckoutRequest,
                                  CheckoutResponse, PortalResponse)
from app.services.billing import (PLAN_LIMITS, billing_account, create_checkout_session,
                                  create_portal_session, current_plan, plan_features, plan_limits)
from app.services.billing import process_webhook, verify_webhook


router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans", response_model=list[BillingPlanRead])
async def list_plans():
    return [BillingPlanRead(id=plan, name=plan.title(), features=list(plan_features(plan)), **limits)
            for plan, limits in PLAN_LIMITS.items()]


@router.get("/account", response_model=BillingAccountRead)
async def get_billing_account(request: Request, session: AsyncSession = Depends(get_session)):
    user_id = uuid.UUID(require_account_user(request))
    account = await billing_account(session, user_id)
    usage = await session.scalar(select(BillingUsage).where(
        BillingUsage.user_id == user_id,
        BillingUsage.period_start == datetime.now(timezone.utc).date().replace(day=1),
    ))
    plan = await current_plan(session, user_id)
    limits = plan_limits(plan)
    return BillingAccountRead(
        plan=plan,
        status=account.status if account else "inactive",
        stripe_customer_configured=bool(account and account.stripe_customer_id),
        subscription_configured=bool(account and account.stripe_subscription_id),
        current_period_end=account.current_period_end if account else None,
        cancel_at_period_end=bool(account and account.cancel_at_period_end),
        usage_scans=usage.scans_count if usage else 0,
        usage_limit=limits["scans_per_month"],
    )


@router.post("/checkout", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
async def create_checkout(payload: CheckoutRequest, request: Request,
                          session: AsyncSession = Depends(get_session)):
    user_id = uuid.UUID(require_account_user(request))
    user = await session.get(User, user_id)
    return CheckoutResponse(checkout_url=await create_checkout_session(session, user, payload.plan, payload.interval))


@router.post("/portal", response_model=PortalResponse)
async def create_portal(request: Request, session: AsyncSession = Depends(get_session)):
    user_id = uuid.UUID(require_account_user(request))
    return PortalResponse(portal_url=await create_portal_session(session, user_id))


@router.post("/webhook", status_code=status.HTTP_200_OK, include_in_schema=False)
async def stripe_webhook(request: Request, session: AsyncSession = Depends(get_session)):
    payload = await request.body()
    event = verify_webhook(payload, request.headers.get("stripe-signature", ""), get_settings().stripe_webhook_secret)
    await process_webhook(session, event)
    return {"received": True}
