import json
import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import (AliasChoices, AnyHttpUrl, BaseModel, ConfigDict, Field, SecretStr,
                      computed_field, field_serializer, model_validator)

from app.models.scan import ScanStatus, ScannerRunStatus, Severity


def build_remediation_prompt(title: str, description: str, evidence: dict[str, Any], remediation: str) -> str:
    evidence_json = json.dumps(evidence or {}, sort_keys=True, default=str)
    return (
        "You are an AI coding agent working in the website's codebase. Fix this audit finding "
        "with the smallest production-safe change.\n\n"
        f"Finding: {title}\n"
        f"Problem: {description}\n"
        f"Evidence: {evidence_json}\n"
        f"Remediation: {remediation}\n\n"
        "Requirements:\n"
        "1. Inspect the existing implementation before editing.\n"
        "2. Apply the fix without weakening unrelated security or functionality.\n"
        "3. Add or update focused tests when applicable.\n"
        "4. Run the relevant validation or build checks.\n"
        "5. Report the files changed, validation performed, and any remaining risk."
    )


class ScanCreate(BaseModel):
    url: AnyHttpUrl | None = None
    project_id: uuid.UUID | None = None
    scan_type: Literal["full", "standard"] = "full"
    scanner_categories: list[str] | None = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def require_target(self):
        if self.url is None and self.project_id is None:
            raise ValueError("Provide url or project_id")
        if self.scan_type == "standard" and not self.scanner_categories:
            raise ValueError("scanner_categories are required for a standard website scan")
        if self.scan_type == "full" and self.scanner_categories:
            self.scan_type = "standard"
        return self


class SqlInjectionScanCreate(BaseModel):
    authorized: bool = Field(
        default=False,
        description="Must be true to confirm authorization for active security testing.",
    )
    include_post_requests: bool = False
    include_time_based: bool = False
    max_pages: int = Field(default=25, ge=1, le=50)

    @model_validator(mode="after")
    def require_authorization(self):
        if not self.authorized:
            raise ValueError("authorized must be true for active SQL injection testing")
        return self


class XssScanCreate(BaseModel):
    authorized: bool = Field(
        default=False,
        description="Must be true to confirm authorization for active security testing.",
    )
    include_post_requests: bool = False
    max_pages: int = Field(default=50, ge=1, le=100)

    @model_validator(mode="after")
    def require_authorization(self):
        if not self.authorized:
            raise ValueError("authorized must be true for active XSS testing")
        return self


ExtendedScanType = Literal[
    "github_sast", "dependencies", "firebase", "tenant_isolation", "audit_logging",
    "ddos_resilience", "mobile_api", "hosting_security",
]


class TenantActor(BaseModel):
    identifier: str = Field(min_length=1, max_length=320)
    password: SecretStr = Field(min_length=12)


class TenantIsolationConfig(BaseModel):
    login_url: str = "/login"
    identifier_selector: str = "input[name=email]"
    password_selector: str = "input[name=password]"
    submit_selector: str = "button[type=submit]"
    actor_a: TenantActor
    actor_b: TenantActor
    resource_paths: list[str] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def validate_paths(self):
        if any(not path.startswith("/") or "?" in path for path in self.resource_paths):
            raise ValueError("resource_paths must be same-origin paths without query strings")
        return self


class ExtendedUrlScanCreate(BaseModel):
    url: AnyHttpUrl
    project_id: uuid.UUID | None = None
    authorized: bool = Field(default=False)
    repository_url: AnyHttpUrl | None = None
    github_token: SecretStr | None = None
    firebase_project_url: AnyHttpUrl | None = None
    firebase_access_token: SecretStr | None = None
    firebase_api_key: SecretStr | None = None
    vercel_project_id: str | None = None
    vercel_token: SecretStr | None = None
    netlify_site_id: str | None = None
    netlify_token: SecretStr | None = None
    cloudflare_zone_id: str | None = None
    cloudflare_api_token: SecretStr | None = None
    tenant: TenantIsolationConfig | None = None
    tenant_test_mode: bool = False

    @model_validator(mode="after")
    def validate_scope(self):
        if not self.authorized:
            raise ValueError("authorized must be true for extended security testing")
        if self.tenant_test_mode and self.tenant is None:
            raise ValueError("tenant configuration is required when tenant_test_mode is enabled")
        return self


class RobotsCrawlRequest(BaseModel):
    url: AnyHttpUrl


class RobotsCrawlFinding(BaseModel):
    scanner_name: str
    category: str
    severity: Severity
    title: str
    description: str
    evidence: dict[str, Any]
    remediation: str
    confidence: float

    @computed_field
    @property
    def remediation_prompt(self) -> str:
        return build_remediation_prompt(self.title, self.description, self.evidence, self.remediation)


class RobotsCrawlRead(BaseModel):
    robots_txt_present: bool
    robots_txt_url: str
    pages_scanned: int
    findings: list[RobotsCrawlFinding]


class FindingRetestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    finding_id: int
    scan_id: uuid.UUID
    retested_by_user_id: uuid.UUID | None = None
    status: Literal["resolved", "persisting", "target_unreachable", "error"]
    http_status_code: int | None = None
    response_time_ms: float | None = None
    message: str
    evidence: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class FindingTriageUpdate(BaseModel):
    triage_status: Literal["open", "in_progress", "accepted_risk", "false_positive", "resolved"]
    triage_note: str | None = None


class FindingRetestResponse(BaseModel):
    finding_id: int
    retest_status: Literal["resolved", "persisting", "target_unreachable", "error"]
    triage_status: str
    http_status_code: int | None = None
    response_time_ms: float | None = None
    message: str
    tested_at: datetime
    evidence: dict[str, Any] = Field(default_factory=dict)


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
    triage_status: str = "open"
    triage_note: str | None = None
    triaged_at: datetime | None = None
    triaged_by_user_id: uuid.UUID | None = None
    last_retested_at: datetime | None = None
    retests: list[FindingRetestRead] = Field(default_factory=list)

    @computed_field
    @property
    def remediation_prompt(self) -> str:
        return build_remediation_prompt(self.title, self.description, self.evidence, self.remediation)



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
    remediation_prompt: str


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
    project_id: uuid.UUID | None = None
    environment: str | None = None
    scan_type: str = "full"
    status: ScanStatus
    overall_score: float | None
    started_at: datetime | None
    finished_at: datetime | None
    metadata_: dict[str, Any] = Field(alias="metadata", validation_alias=AliasChoices("metadata_", "metadata"))
    findings: list[FindingRead] = Field(default_factory=list)
    progress: ScanProgressRead | None = None
    scanner_runs: list[ScannerRunRead] = Field(default_factory=list)

    @field_serializer("metadata_")
    def serialize_metadata(self, value: dict[str, Any]) -> dict[str, Any]:
        safe_value = dict(value or {})
        security_test = dict(safe_value.get("security_test") or {})
        security_test.pop("webhook_secret_encrypted", None)
        security_test.pop("test_account_encrypted", None)
        security_test.pop("flow_encrypted", None)
        security_test.pop("rate_limit_probe_encrypted", None)
        security_test.pop("integration_encrypted", None)
        safe_value["security_test"] = security_test
        return safe_value

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
                remediation_prompt=build_remediation_prompt(
                    finding.title, finding.description, finding.evidence, finding.remediation
                ),
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
