import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("owner_user_id", "slug", name="uq_projects_owner_slug"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(80))
    production_url: Mapped[str] = mapped_column(String(2048))
    staging_url: Mapped[str | None] = mapped_column(String(2048))
    preview_url: Mapped[str | None] = mapped_column(String(2048))
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    schedule_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    schedule_interval_minutes: Mapped[int] = mapped_column(Integer, default=1440)
    schedule_environment: Mapped[str] = mapped_column(String(20), default="production")
    schedule_next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    api_keys: Mapped[list["ApiKey"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    scans: Mapped[list["Scan"]] = relationship(back_populates="project")
    supabase_connection: Mapped["SupabaseConnection | None"] = relationship(
        back_populates="project", uselist=False, cascade="all, delete-orphan"
    )
