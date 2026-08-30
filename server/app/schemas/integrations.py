import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, Field, SecretStr


class ScheduleRead(BaseModel):
    enabled: bool
    interval_minutes: int
    next_run_at: datetime | None


class ScheduleUpdate(BaseModel):
    enabled: bool | None = None
    interval_minutes: int | None = Field(default=None, ge=60, le=43200)


class ProjectWebhookCreate(BaseModel):
    url: AnyHttpUrl
    secret: SecretStr = Field(min_length=32)
    events: list[Literal["scan.completed", "scan.failed", "scan.regression", "uptime.down", "uptime.recovered"]] = Field(min_length=1, max_length=5)


class ProjectWebhookRead(BaseModel):
    id: uuid.UUID
    url: str
    events: list[str]
    enabled: bool
    created_at: datetime | None
    updated_at: datetime | None


class ProviderConnectionCreate(BaseModel):
    configuration: dict[str, Any] = Field(min_length=1)


class ProviderConnectionRead(BaseModel):
    id: uuid.UUID
    provider: str
    configured: bool = True
    created_at: datetime | None
    updated_at: datetime | None


class ProjectActivityRead(BaseModel):
    type: str
    severity: str
    title: str
    category: str
    occurred_at: datetime | None
    status: str | None = None
