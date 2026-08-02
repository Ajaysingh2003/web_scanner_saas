from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AetherScan"
    database_url: str = "postgresql+asyncpg://aetherscan:aetherscan@localhost:5432/aetherscan"
    redis_url: str = "redis://localhost:6379/0"
    user_agent: str = "AetherScan/1.0 (+https://aetherscan.example)"
    scanner_timeout_seconds: float = 25.0
    scanner_concurrency: int = 8
    api_key_enabled: bool = True
    api_keys: str = ""
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60
    rate_limit_key_prefix: str = "aetherscan:rate-limit"
    trust_proxy_headers: bool = False
    auth_jwt_secret: str = ""
    auth_access_token_minutes: int = 15
    auth_refresh_token_days: int = 30
    auth_email_verification_required: bool = True
    auth_email_verification_hours: int = 24
    auth_frontend_url: str = "http://localhost:3000"
    supabase_encryption_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:8000/api/v1/auth/github/callback"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
