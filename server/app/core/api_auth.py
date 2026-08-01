import hashlib
import hmac

from fastapi import HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.config import Settings, get_settings


def configured_api_keys(settings: Settings) -> tuple[str, ...]:
    return tuple(key.strip() for key in settings.api_keys.split(",") if key.strip())


def presented_api_key(request: Request) -> str | None:
    api_key = request.headers.get("x-api-key")
    if api_key:
        return api_key.strip()
    authorization = request.headers.get("authorization", "")
    scheme, _, credentials = authorization.partition(" ")
    if scheme.lower() == "bearer" and credentials:
        return credentials.strip()
    return None


def api_key_fingerprint(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()[:24]


def is_valid_api_key(api_key: str | None, settings: Settings) -> bool:
    if not api_key:
        return False
    return any(hmac.compare_digest(api_key, configured) for configured in configured_api_keys(settings))


def require_api_key(request: Request) -> str | None:
    settings = get_settings()
    if not settings.api_key_enabled:
        return None
    api_key = presented_api_key(request)
    if not is_valid_api_key(api_key, settings):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid API key is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    fingerprint = api_key_fingerprint(api_key or "")
    request.scope["api_key_fingerprint"] = fingerprint
    return fingerprint


class ApiKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        settings = get_settings()
        if not settings.api_key_enabled or not request.url.path.startswith("/api/"):
            return await call_next(request)

        api_key = presented_api_key(request)
        if not configured_api_keys(settings) or not is_valid_api_key(api_key, settings):
            return Response(
                content='{"detail":"A valid API key is required"}',
                status_code=401,
                media_type="application/json",
                headers={"WWW-Authenticate": "Bearer"},
            )
        request.scope["api_key_fingerprint"] = api_key_fingerprint(api_key or "")
        return await call_next(request)
