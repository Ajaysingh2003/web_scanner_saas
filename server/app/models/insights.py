import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CompetitorBenchmark(Base):
    __tablename__ = "competitor_benchmarks"
    __table_args__ = (UniqueConstraint("project_id", "url", name="uq_competitor_project_url"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(120))
    url: Mapped[str] = mapped_column(String(2048))
    score: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="queued")
    last_scan_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("scans.id", ondelete="SET NULL"))
    last_scanned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RoiProfile(Base):
    __tablename__ = "roi_profiles"
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    monthly_sessions: Mapped[int] = mapped_column(Integer, default=10000)
    average_order_value: Mapped[float] = mapped_column(Float, default=100)
    conversion_rate: Mapped[float] = mapped_column(Float, default=2)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    lcp_delay_seconds: Mapped[float] = mapped_column(Float, default=1.2)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
