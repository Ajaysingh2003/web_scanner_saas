import uuid
from datetime import datetime
from typing import Any

from pydantic import AliasChoices, AnyHttpUrl, BaseModel, ConfigDict, Field, computed_field

from app.models.scan import ScanStatus, ScannerRunStatus, Severity


class ScanCreate(BaseModel):
    url: AnyHttpUrl


class FindingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    scanner_name: str
    category: str
    severity: Severity
    title: str
    description: str
    evidence: dict[str, Any]
    remediation: str
    confidence: float


class ScanProgressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_scanners: int
    completed_scanners: int
    failed_scanners: int
    current_scanner: str | None
    updated_at: datetime | None


class ScannerRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    scanner_name: str
    category: str
    status: ScannerRunStatus
    findings_count: int
    error: str | None
    started_at: datetime | None
    finished_at: datetime | None


class ReportFindingRead(BaseModel):
    id: int
    title: str
    category: str
    severity: Severity
    confidence: float
    remediation: str


class ReportSummary(BaseModel):
    risk_level: str
    executive_summary: str
    finding_counts: dict[str, int]
    category_scores: dict[str, float]
    global_score: float
    coverage_score: float
    score_benchmark: str
    top_findings: list[ReportFindingRead]
    next_steps: list[str]
    scanner_failures: int


class ScanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    url: str
    status: ScanStatus
    overall_score: float | None
    started_at: datetime | None
    finished_at: datetime | None
    metadata_: dict[str, Any] = Field(alias="metadata", validation_alias=AliasChoices("metadata_", "metadata"))
    findings: list[FindingRead] = Field(default_factory=list)
    progress: ScanProgressRead | None = None
    scanner_runs: list[ScannerRunRead] = Field(default_factory=list)

    @computed_field
    @property
    def report(self) -> ReportSummary:
        severity_order = {
            Severity.critical: 5,
            Severity.high: 4,
            Severity.medium: 3,
            Severity.low: 2,
            Severity.info: 1,
        }
        counts = {severity.value: 0 for severity in Severity}
        for finding in self.findings:
            counts[finding.severity.value] += 1
        priority_findings = sorted(
            self.findings,
            key=lambda finding: (severity_order[finding.severity], finding.confidence),
            reverse=True,
        )
        top_findings = [
            ReportFindingRead(
                id=finding.id,
                title=finding.title,
                category=finding.category,
                severity=finding.severity,
                confidence=finding.confidence,
                remediation=finding.remediation,
            )
            for finding in priority_findings[:5]
        ]
        next_steps = list(dict.fromkeys(
            finding.remediation.strip() for finding in priority_findings
            if finding.remediation.strip()
        ))[:5]
        critical_or_high = counts[Severity.critical.value] + counts[Severity.high.value]
        if counts[Severity.critical.value]:
            risk_level = "critical"
        elif counts[Severity.high.value]:
            risk_level = "high"
        elif counts[Severity.medium.value]:
            risk_level = "medium"
        elif counts[Severity.low.value]:
            risk_level = "low"
        else:
            risk_level = "informational"
        if critical_or_high:
            executive_summary = (
                f"{critical_or_high} high-priority finding(s) need attention first. "
                "Use the prioritized remediation steps below before treating the score as production-ready."
            )
        elif counts[Severity.medium.value] or counts[Severity.low.value]:
            executive_summary = "No critical or high findings were detected, but the report contains improvements that will strengthen the site's posture."
        else:
            executive_summary = "No actionable security findings were detected by the completed scanners."
        scoring = (self.metadata_ or {}).get("scoring", {})
        failures = (self.metadata_ or {}).get("scanner_failures", [])
        return ReportSummary(
            risk_level=risk_level,
            executive_summary=executive_summary,
            finding_counts=counts,
            category_scores=scoring.get("category_scores", {}),
            global_score=scoring.get("global_score", self.overall_score or 100.0),
            coverage_score=scoring.get("coverage_score", self.overall_score or 100.0),
            score_benchmark="strict-v1",
            top_findings=top_findings,
            next_steps=next_steps,
            scanner_failures=len(failures),
        )
