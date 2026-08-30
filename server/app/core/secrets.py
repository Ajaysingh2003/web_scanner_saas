import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _fernet() -> Fernet:
    settings = get_settings()
    configured_key = settings.supabase_encryption_key.strip()
    if configured_key:
        return Fernet(configured_key.encode())
    derived_key = base64.urlsafe_b64encode(
        hashlib.sha256(settings.auth_jwt_secret.encode()).digest()
    )
    return Fernet(derived_key)


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken as error:
        raise ValueError("Unable to decrypt the stored Supabase credential") from error
