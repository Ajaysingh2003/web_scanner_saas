import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import get_settings


password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return password_hasher.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def random_token() -> str:
    return secrets.token_urlsafe(48)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": user_id, "typ": "access", "iat": now, "exp": now + timedelta(minutes=settings.auth_access_token_minutes)},
        settings.auth_jwt_secret,
        algorithm="HS256",
    )


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, get_settings().auth_jwt_secret, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None
    if payload.get("typ") != "access" or not payload.get("sub"):
        return None
    return str(payload["sub"])


def oauth_state(provider: str) -> str:
    expires = int(datetime.now(timezone.utc).timestamp()) + 600
    nonce = secrets.token_urlsafe(24)
    unsigned = f"{provider}.{expires}.{nonce}"
    signature = hmac.new(get_settings().auth_jwt_secret.encode(), unsigned.encode(), hashlib.sha256).hexdigest()
    return f"{unsigned}.{signature}"


def verify_oauth_state(state: str, provider: str) -> bool:
    parts = state.split(".", 3)
    if len(parts) != 4 or parts[0] != provider:
        return False
    unsigned = ".".join(parts[:3])
    expected = hmac.new(get_settings().auth_jwt_secret.encode(), unsigned.encode(), hashlib.sha256).hexdigest()
    try:
        not_expired = int(parts[1]) >= int(datetime.now(timezone.utc).timestamp())
    except ValueError:
        return False
    return not_expired and hmac.compare_digest(expected, parts[3])


def oauth_authorization_url(provider: str, state: str) -> str:
    settings = get_settings()
    if provider == "google":
        base = "https://accounts.google.com/o/oauth2/v2/auth"
        params = {"client_id": settings.google_client_id, "redirect_uri": settings.google_redirect_uri,
                  "response_type": "code", "scope": "openid email profile", "state": state, "access_type": "offline"}
    else:
        base = "https://github.com/login/oauth/authorize"
        params = {"client_id": settings.github_client_id, "redirect_uri": settings.github_redirect_uri,
                  "scope": "read:user user:email", "state": state}
    return f"{base}?{urlencode(params)}"
