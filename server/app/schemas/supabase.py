import uuid
from datetime import datetime

from pydantic import AnyHttpUrl, BaseModel, Field, SecretStr


class SupabaseConnectionCreate(BaseModel):
    project_url: AnyHttpUrl
    anon_key: SecretStr = Field(min_length=20)
    service_role_key: SecretStr | None = Field(default=None, min_length=20)


class SupabaseConnectionRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    project_url: str
    anon_key_configured: bool
    service_role_key_configured: bool
    created_at: datetime | None
    updated_at: datetime | None
