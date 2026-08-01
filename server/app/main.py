from contextlib import asynccontextmanager

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI

from app.api.v1.scans import router as scans_router
from app.core.api_auth import ApiKeyMiddleware
from app.core.config import get_settings
from app.core.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await create_pool(RedisSettings.from_dsn(get_settings().redis_url))
    yield
    await app.state.redis.close()


app = FastAPI(title="AetherScan API", version="0.1.0", lifespan=lifespan)
app.add_middleware(ApiKeyMiddleware)
app.add_middleware(RateLimitMiddleware)
app.include_router(scans_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
