import time
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import SessionFactory
from app.core.http import fetch_with_ssl_fallback, http_clients
from app.models.scan import Finding, FindingRetest, Scan
from app.scanners.base import ScanContext
from app.scanners.registry import get_scanner_by_name


async def perform_single_finding_retest(
    finding: Finding,
    scan: Scan,
    user_id: uuid.UUID | None,
    session: AsyncSession,
) -> FindingRetest:
    """
    Executes an isolated, sub-1.5s live verification check for a single finding.
    Enforces strict health guardrails (no auto-resolving on 5xx or connection drops).
    """
    start_time = time.perf_counter()
    settings = get_settings()
    timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
    headers = {"User-Agent": f"{settings.user_agent} (Re-test Probe)"}

    http_status_code: int | None = None
    retest_status: str = "persisting"
    message: str = ""
    evidence_out: dict[str, Any] = {}

    target_url = scan.url
    # If the finding specifies an affected path, we can test target with path context
    evidence = finding.evidence or {}
    path = evidence.get("url_path") or evidence.get("page_path") or evidence.get("path")
    if path and isinstance(path, str) and path.startswith("/"):
        from urllib.parse import urljoin
        probe_target = urljoin(scan.url, path)
    else:
        probe_target = scan.url

    scanner = get_scanner_by_name(finding.scanner_name)
    if scanner is None:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        retest_record = FindingRetest(
            finding_id=finding.id,
            scan_id=scan.id,
            retested_by_user_id=user_id,
            status="error",
            http_status_code=None,
            response_time_ms=duration_ms,
            message=f"Scanner '{finding.scanner_name}' is not available for isolated single-finding re-test.",
            evidence={"error": "ScannerNotFound"},
        )
        session.add(retest_record)
        finding.last_retested_at = datetime.now(timezone.utc)
        await session.commit()
        return retest_record

    limits = httpx.Limits(max_connections=5, max_keepalive_connections=5)

    try:
        async with http_clients(timeout=timeout, limits=limits, headers=headers) as (verified, insecure):

            # 1. Health Probe
            probe_response, ssl_error = await fetch_with_ssl_fallback(verified, insecure, probe_target)
            if probe_response is not None:
                http_status_code = probe_response.status_code

            if probe_response is None:
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                retest_status = "target_unreachable"
                message = f"Target {probe_target} is unreachable or connection timed out. Fix cannot be verified on an unreachable target."
                evidence_out = {"error": "ConnectionFailed", "target": probe_target, "ssl_error": ssl_error}
            elif probe_response.status_code >= 500:
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                retest_status = "target_unreachable"
                message = f"Target returned HTTP {probe_response.status_code} server error during probe. Re-test blocked to prevent false resolutions."
                evidence_out = {"http_status": probe_response.status_code, "target": probe_target}
            elif probe_response.status_code == 404:
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                retest_status = "target_unreachable"
                message = f"Target returned HTTP 404 Not Found. Route may have moved or been deleted."
                evidence_out = {"http_status": 404, "target": probe_target}
            else:
                # 2. Run Isolated Scanner Check
                scanner_http = insecure if ssl_error else verified
                scan_context = ScanContext(
                    http=scanner_http,
                    ssl_error=ssl_error,
                    session_factory=SessionFactory,
                    security_test=(scan.metadata_ or {}).get("security_test"),
                )

                new_findings = await scanner.scan(scan.url, scan_context)

                # Check if this exact finding signature is still detected
                matching = [
                    f for f in new_findings
                    if f.title.strip().lower() == finding.title.strip().lower()
                ]

                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                if not matching:
                    retest_status = "resolved"
                    message = "Vulnerability verified as resolved! Live probe did not detect the issue."
                    evidence_out = {"verified_at": datetime.now(timezone.utc).isoformat(), "http_status": http_status_code}
                    # Automatically mark finding as resolved if it was open
                    if finding.triage_status in ("open", "in_progress"):
                        finding.triage_status = "resolved"
                        finding.triage_note = "Verified and resolved via automated live re-test."
                        finding.triaged_at = datetime.now(timezone.utc)
                        finding.triaged_by_user_id = user_id
                else:
                    retest_status = "persisting"
                    match = matching[0]
                    message = f"Vulnerability is still present: {match.description or match.title}"
                    sev_val = match.severity.value if hasattr(match.severity, "value") else str(match.severity)
                    evidence_out = {
                        "persisting_evidence": match.evidence,
                        "severity": sev_val,
                        "http_status": http_status_code,
                    }


    except Exception as exc:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        retest_status = "error"
        message = f"Re-test execution error: {type(exc).__name__}: {str(exc)[:200]}"
        evidence_out = {"exception": str(exc)[:500]}

    finding.last_retested_at = datetime.now(timezone.utc)

    retest_record = FindingRetest(
        finding_id=finding.id,
        scan_id=scan.id,
        retested_by_user_id=user_id,
        status=retest_status,
        http_status_code=http_status_code,
        response_time_ms=duration_ms,
        message=message,
        evidence=evidence_out,
    )
    session.add(retest_record)
    await session.commit()
    await session.refresh(retest_record)
    return retest_record
