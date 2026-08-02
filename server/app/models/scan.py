import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ScanStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class ScannerRunStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class Severity(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class Scan(Base):
    __tablename__ = "scans"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), index=True)
    environment: Mapped[str | None] = mapped_column(String(20))
    scan_type: Mapped[str] = mapped_column(String(40), nullable=False, default="full", server_default="full")
    api_key_id: Mapped[str | None] = mapped_column(String(24), index=True)
    api_key_fingerprint: Mapped[str | None] = mapped_column(String(24), index=True)
    status: Mapped[ScanStatus] = mapped_column(Enum(ScanStatus), default=ScanStatus.queued, index=True)
    overall_score: Mapped[float | None] = mapped_column(Float)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    findings: Mapped[list["Finding"]] = relationship(back_populates="scan", cascade="all, delete-orphan")
    progress: Mapped["ScanProgress | None"] = relationship(back_populates="scan", uselist=False,
        cascade="all, delete-orphan")
    scanner_runs: Mapped[list["ScannerRun"]] = relationship(back_populates="scan",
        cascade="all, delete-orphan")
    project: Mapped["Project | None"] = relationship(back_populates="scans")


class ScanProgress(Base):
    __tablename__ = "scan_progress"
    scan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scans.id", ondelete="CASCADE"), primary_key=True)
    total_scanners: Mapped[int] = mapped_column(Integer, default=0)
    completed_scanners: Mapped[int] = mapped_column(Integer, default=0)
    failed_scanners: Mapped[int] = mapped_column(Integer, default=0)
    current_scanner: Mapped[str | None] = mapped_column(String(120))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    scan: Mapped[Scan] = relationship(back_populates="progress")


class ScannerRun(Base):
    __tablename__ = "scanner_runs"
    scan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scans.id", ondelete="CASCADE"), primary_key=True)
    scanner_name: Mapped[str] = mapped_column(String(120), primary_key=True)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[ScannerRunStatus] = mapped_column(Enum(ScannerRunStatus), default=ScannerRunStatus.queued)
    findings_count: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scan: Mapped[Scan] = relationship(back_populates="scanner_runs")


class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scans.id", ondelete="CASCADE"), index=True)
    scanner_name: Mapped[str] = mapped_column(String(120), index=True)
    category: Mapped[str] = mapped_column(String(40), index=True)
    severity: Mapped[Severity] = mapped_column(Enum(Severity), index=True)
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str] = mapped_column(Text)
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    remediation: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    raw_data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    scan: Mapped[Scan] = relationship(back_populates="findings")
