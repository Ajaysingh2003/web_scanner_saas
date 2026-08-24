from contextlib import asynccontextmanager

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI

from app.api.v1.scans import (robots_crawl_router, router as scans_router,
                               security_tests_router, extended_security_router)
from app.api.v1.auth import router as auth_router
from app.api.v1.otp import router as otp_router
from app.api.v1.projects import router as projects_router
from app.api.v1.billing import router as billing_router
from app.api.v1.monitoring import public_router as public_monitoring_router, router as monitoring_router
from app.api.v1.reports import public_router as public_reports_router, router as reports_router
from app.core.api_auth import ApiKeyMiddleware
from app.core.config import get_settings
from app.core.rate_limit import RateLimitMiddleware
from app.core.request_context import RequestContextMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if len(settings.auth_jwt_secret) < 32:
        raise RuntimeError("AUTH_JWT_SECRET must be configured with at least 32 random characters")
    app.state.redis = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    yield
    await app.state.redis.close()


app = FastAPI(title="AetherScan API", version="0.1.0", lifespan=lifespan)
app.add_middleware(ApiKeyMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestContextMiddleware)
app.include_router(scans_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api", include_in_schema=False)
app.include_router(otp_router, prefix="/api/v1")
app.include_router(otp_router, prefix="/api", include_in_schema=False)
app.include_router(projects_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api", include_in_schema=False)
app.include_router(billing_router, prefix="/api/v1")
app.include_router(billing_router, prefix="/api", include_in_schema=False)
app.include_router(monitoring_router, prefix="/api/v1")
app.include_router(monitoring_router, prefix="/api", include_in_schema=False)
app.include_router(public_monitoring_router, prefix="/api/v1")
app.include_router(public_monitoring_router, prefix="/api", include_in_schema=False)
app.include_router(reports_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api", include_in_schema=False)
app.include_router(public_reports_router, prefix="/api/v1")
app.include_router(public_reports_router, prefix="/api", include_in_schema=False)
app.include_router(robots_crawl_router, prefix="/api/v1")
app.include_router(robots_crawl_router, prefix="/api", include_in_schema=False)
app.include_router(security_tests_router, prefix="/api/v1")
app.include_router(security_tests_router, prefix="/api", include_in_schema=False)
app.include_router(extended_security_router, prefix="/api/v1")
app.include_router(extended_security_router, prefix="/api", include_in_schema=False)


@app.get("/health")
async def health():
    return {"status": "ok"}
