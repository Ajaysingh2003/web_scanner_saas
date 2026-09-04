import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator


class ProjectSettings(BaseModel):
    scan_profile: Literal["standard", "strict"] = "strict"
    notify_on_completion: bool = False
    notification_email: str | None = None


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    website_url: AnyHttpUrl
    settings: ProjectSettings = Field(default_factory=ProjectSettings)
    schedule_enabled: bool = False
    schedule_interval_minutes: int = Field(default=1440, ge=60, le=43200)

    @field_validator("website_url", mode="before")
    @classmethod
    def normalize_website_url(cls, v: Any) -> Any:
        if isinstance(v, str):
            v = v.strip()
            if v and not v.startswith(("http://", "https://")):
                return f"https://{v}"
        return v


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=120)
    settings: ProjectSettings | None = None
    schedule_enabled: bool | None = None
    schedule_interval_minutes: int | None = Field(default=None, ge=60, le=43200)


class ProjectRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    website_url: str
    settings: dict[str, Any]
    schedule_enabled: bool
    schedule_interval_minutes: int
    schedule_next_run_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None


class ProjectApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
