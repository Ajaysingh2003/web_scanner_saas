import uuid
from datetime import datetime

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, SecretStr


class UptimeMonitorCreate(BaseModel):
    url: AnyHttpUrl
    interval_seconds: int = Field(default=60, ge=60, le=86400)
    timeout_seconds: int = Field(default=10, ge=3, le=30)
    alert_webhook_url: AnyHttpUrl | None = None
    alert_webhook_secret: SecretStr | None = Field(default=None, min_length=32)


class UptimeMonitorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID
    url: str
    enabled: bool
    interval_seconds: int
    timeout_seconds: int
    status: str
    last_status_code: int | None
    last_response_ms: int | None
    last_checked_at: datetime | None
    consecutive_failures: int
    consecutive_successes: int
    public_status_url: str | None = None


class UptimeCheckRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    checked_at: datetime
    is_up: bool
    status_code: int | None
    response_ms: int | None
    error: str | None


class UptimeIncidentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    monitor_id: uuid.UUID
    status: str
    started_at: datetime
    resolved_at: datetime | None
    failure_count: int
    recovery_count: int
    last_error: str | None


class ReportShareCreate(BaseModel):
    expires_in_hours: int | None = Field(default=168, ge=1, le=8760)


class ReportShareRead(BaseModel):
    url: str
    expires_at: datetime | None


class ReportExportOptions(BaseModel):
    format: str = Field(default="json", pattern="^(json|markdown|pdf)$")
    brand_name: str | None = Field(default=None, max_length=120)
    accent_color: str = Field(default="#2563eb", pattern=r"^#[0-9A-Fa-f]{6}$")
