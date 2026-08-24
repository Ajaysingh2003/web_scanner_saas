import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class OverviewFinding(BaseModel):
    id: int
    category: str
    severity: str
    title: str
    description: str
    locked: bool = False


class OverviewScan(BaseModel):
    id: uuid.UUID
    status: str
    score: float | None
    url: str
    environment: str | None
    started_at: datetime | None
    finished_at: datetime | None


class OverviewProject(BaseModel):
    id: uuid.UUID
    name: str
    production_url: str
    staging_url: str | None
    preview_url: str | None


class ProjectOverview(BaseModel):
    project: OverviewProject
    plan: Literal["starter", "pro", "max"]
    latest_scan: OverviewScan | None
    score: float | None
    risk_level: str
    total_findings: int
    severity_counts: dict[str, int]
    category_scores: dict[str, float]
    findings: list[OverviewFinding]
    locked_findings: int
    has_scan: bool
    scan_available: bool
    scan_limit_reached: bool = False
    setup: dict[str, Any]
