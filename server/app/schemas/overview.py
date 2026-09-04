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
    website_url: str


class ProjectOverview(BaseModel):
    project: OverviewProject
    plan: Literal["free", "starter", "pro", "max"]

    latest_scan: OverviewScan | None
    score: float | None
    risk_level: str
    total_findings: int
    severity_counts: dict[str, int]
    category_scores: dict[str, float]
    category_counts: dict[str, int] = {}
    findings: list[OverviewFinding]
    locked_findings: int

    has_scan: bool
    scan_available: bool
    scan_limit_reached: bool = False
    setup: dict[str, Any]
    failed_scanners: int = 0
    coverage_score: float = 100.0
    global_score: float | None = None
