import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, Field


Environment = Literal["production", "staging", "preview"]


class ProjectSettings(BaseModel):
    scan_profile: Literal["standard", "strict"] = "strict"
    notify_on_completion: bool = False
    notification_email: str | None = None


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    production_url: AnyHttpUrl
    staging_url: AnyHttpUrl | None = None
    preview_url: AnyHttpUrl | None = None
    settings: ProjectSettings = Field(default_factory=ProjectSettings)
    schedule_enabled: bool = False
    schedule_interval_minutes: int = Field(default=1440, ge=60, le=43200)
    schedule_environment: Environment = "production"


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    production_url: AnyHttpUrl | None = None
    staging_url: AnyHttpUrl | None = None
    preview_url: AnyHttpUrl | None = None
    settings: ProjectSettings | None = None
    schedule_enabled: bool | None = None
    schedule_interval_minutes: int | None = Field(default=None, ge=60, le=43200)
    schedule_environment: Environment | None = None


class ProjectRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    production_url: str
    staging_url: str | None
    preview_url: str | None
    settings: dict[str, Any]
    schedule_enabled: bool
    schedule_interval_minutes: int
    schedule_environment: Environment
    schedule_next_run_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None


class ProjectApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
