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
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
