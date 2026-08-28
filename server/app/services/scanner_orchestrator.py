import asyncio
import json
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.database import SessionFactory
from app.core.http import fetch_with_ssl_fallback, http_clients
from app.core.secrets import decrypt_secret
from app.models import (CompetitorBenchmark, Finding, ProjectWebhook, Scan, ScanProgress, ScanStatus,
                        ScannerRun, ScannerRunStatus, SupabaseConnection, UptimeMonitor)
from app.core.secrets import decrypt_secret
from app.scanners.base import ScanContext
from app.scanners.registry import get_scanners, get_security_test_scanners
from app.services.scoring import score_breakdown
from app.services.scan_diff import compare_finding_lists
from app.services.webhooks import send_webhook


def _deduplicate_findings(findings):
    """Merge repeated scanner signals while preserving each affected location."""
    merged = []
    indexes = {}
    location_keys = {"page_path", "url_path", "response_paths", "affected_controls", "parameter"}
    for finding in findings:
        stable_evidence = {
            key: value for key, value in (finding.evidence or {}).items() if key not in location_keys
        }
        fingerprint = json.dumps({
            "scanner": finding.scanner_name if hasattr(finding, "scanner_name") else None,
            "severity": finding.severity.value if hasattr(finding.severity, "value") else str(finding.severity),
            "title": finding.title,
            "stable_evidence": stable_evidence,
        }, sort_keys=True, default=str)
        existing_index = indexes.get(fingerprint)
        if existing_index is None:
            indexes[fingerprint] = len(merged)
            merged.append(finding)
            continue
        existing = merged[existing_index]
        instances = existing.evidence.setdefault("affected_instances", [])
        if finding.evidence and finding.evidence not in instances:
            instances.append(finding.evidence)
        existing.confidence = max(existing.confidence, finding.confidence)
    return merged


async def run_scan(scan_id, session: AsyncSession) -> None:
    scan = await session.get(Scan, scan_id)
    if scan is None:
        return
    security_test_scanners = get_security_test_scanners(scan.scan_type)
    supabase_connection = None
    if security_test_scanners:
        scanners = security_test_scanners
    else:
        scanners = None
    if scan.project_id:
        supabase_connection = await session.scalar(
            select(SupabaseConnection).where(SupabaseConnection.project_id == scan.project_id)
        )
    if scanners is None:
        scanners = get_scanners(include_supabase=supabase_connection is not None)
    scanner_categories = (scan.metadata_ or {}).get("scanner_categories")
    if scanner_categories and not security_test_scanners:
        scanners = [scanner for scanner in scanners if scanner.category in set(scanner_categories)]
    supabase_context = None
    if supabase_connection:
        try:
            supabase_context = {
                "project_url": supabase_connection.project_url,
                "anon_key": decrypt_secret(supabase_connection.anon_key_encrypted),
            }
            if supabase_connection.service_role_key_encrypted:
                supabase_context["service_role_key"] = decrypt_secret(
                    supabase_connection.service_role_key_encrypted
                )
        except ValueError:
            supabase_context = {
                "project_url": supabase_connection.project_url,
                "credentials_unavailable": "true",
            }
    scan.status = ScanStatus.running
    scan.started_at = datetime.now(timezone.utc)
    progress = await session.get(ScanProgress, scan.id)
    if progress is None:
        session.add(ScanProgress(scan_id=scan.id, total_scanners=len(scanners)))
    else:
        progress.total_scanners = len(scanners)
        progress.completed_scanners = 0
        progress.failed_scanners = 0
    existing_runs = list((await session.scalars(
        select(ScannerRun).where(ScannerRun.scan_id == scan.id)
    )).all())
    runs_by_name = {run.scanner_name: run for run in existing_runs}
    for scanner in scanners:
        run = runs_by_name.get(scanner.name)
        if run is None:
            session.add(ScannerRun(scan_id=scan.id, scanner_name=scanner.name,
                                   category=scanner.category, status=ScannerRunStatus.queued))
        else:
            run.category = scanner.category
            run.status = ScannerRunStatus.queued
            run.findings_count = 0
            run.error = None
            run.started_at = None
            run.finished_at = None
    await session.commit()
    settings = get_settings()
    limits = httpx.Limits(max_connections=settings.scanner_concurrency)
    timeout = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)
    headers = {"User-Agent": settings.user_agent}
    async with http_clients(timeout=timeout, limits=limits, headers=headers) as (verified, insecure):
        _probe, ssl_error = await fetch_with_ssl_fallback(verified, insecure, scan.url)
        scanner_http = insecure if ssl_error else verified
        security_test_runtime: dict[str, object] = {}
        semaphore = asyncio.Semaphore(settings.scanner_concurrency)
        progress_lock = asyncio.Lock()

        async def mark_scanner(scanner_name: str, status: ScannerRunStatus,
                               findings_count: int = 0, error: str | None = None) -> None:
            async with progress_lock:
                async with SessionFactory() as progress_session:
                    current = await progress_session.get(ScanProgress, scan.id)
                    run = await progress_session.get(ScannerRun, {
                        "scan_id": scan.id, "scanner_name": scanner_name
                    })
                    now = datetime.now(timezone.utc)
                    if run is not None:
                        run.status = status
                        run.findings_count = findings_count
                        run.error = error
                        if status == ScannerRunStatus.running:
                            run.started_at = now
                        else:
                            run.finished_at = now
                    if current is not None:
                        if status in (ScannerRunStatus.completed, ScannerRunStatus.failed):
                            current.completed_scanners += 1
                            current.failed_scanners += status == ScannerRunStatus.failed
                        current.current_scanner = scanner_name
                    await progress_session.commit()

        async def execute(scanner):
            async with semaphore:
                await mark_scanner(scanner.name, ScannerRunStatus.running)
                is_deep = (
                    security_test_scanners is not None
                    or scanner.name in {"sqli_security", "xss_active", "authentication", "lighthouse_performance", "extended_security"}
                )
                scanner_timeout = 180.0 if is_deep else max(60.0, settings.scanner_timeout_seconds)
                try:
                    findings = await asyncio.wait_for(
                        scanner.scan(
                            scan.url,
                            ScanContext(
                                scanner_http,
                                ssl_error=ssl_error,
                                supabase=supabase_context,
                                security_test=(scan.metadata_ or {}).get("security_test"),
                                security_test_runtime=security_test_runtime,
                                session_factory=SessionFactory,
                            ),
                        ),
                        timeout=scanner_timeout,
                    )
                    await mark_scanner(scanner.name, ScannerRunStatus.completed, len(findings))
                    return scanner, findings, False, None
                except Exception as exc:
                    error = f"{type(exc).__name__}: {exc}"[:2000]
                    await mark_scanner(scanner.name, ScannerRunStatus.failed, error=error)
                    return scanner, [], True, error
        results = await asyncio.gather(*(execute(scanner) for scanner in scanners))
    for scanner, findings, _failed, _error in results:
        findings = _deduplicate_findings(findings)
        session.add_all(Finding(scan_id=scan.id, scanner_name=scanner.name, category=scanner.category,
            severity=item.severity, title=item.title, description=item.description, evidence=item.evidence,
            remediation=item.remediation, confidence=item.confidence, raw_data=item.raw_data) for item in findings)
    await session.flush()
    stored = list((await session.scalars(select(Finding).where(Finding.scan_id == scan.id))).all())
    failed_scanners = sum(1 for _, _, failed, _ in results if failed)
    breakdown = score_breakdown(stored, {scanner.category for scanner in scanners}, failed_scanners)
    scan.overall_score = breakdown["overall_score"]
    scan.metadata_ = {
        **(scan.metadata_ or {}),
        "scoring": breakdown,
        **({"security_test_runtime": security_test_runtime} if security_test_runtime else {}),
        "scanner_failures": [
            {"scanner": scanner.name, "error": error}
            for scanner, _findings, failed, error in results if failed
        ],
    }
    scan.status = ScanStatus.failed if all(failed for _, _, failed, _ in results) else ScanStatus.completed
    scan.finished_at = datetime.now(timezone.utc)
    benchmark_id = (scan.metadata_ or {}).get("benchmark_id")
    if benchmark_id:
        benchmark = await session.get(CompetitorBenchmark, benchmark_id)
        if benchmark:
            benchmark.score = scan.overall_score
            benchmark.status = "completed" if scan.status == ScanStatus.completed else "failed"
            benchmark.last_scanned_at = scan.finished_at
    if scan.status == ScanStatus.completed and scan.project_id:
        previous = await session.scalar(select(Scan).where(
            Scan.project_id == scan.project_id, Scan.url == scan.url,
            Scan.status == ScanStatus.completed, Scan.id != scan.id,
            Scan.finished_at < scan.finished_at,
        ).options(selectinload(Scan.findings)).order_by(Scan.finished_at.desc()).limit(1))
        if previous:
            comparison = compare_finding_lists(stored, previous.findings, scan.overall_score,
                                                previous.overall_score, previous.id)
            scan.metadata_ = {
                **scan.metadata_,
                "comparison": comparison,
            }
            if comparison["regression_detected"]:
                monitor = await session.scalar(select(UptimeMonitor).where(
                    UptimeMonitor.project_id == scan.project_id, UptimeMonitor.enabled,
                    UptimeMonitor.alert_webhook_url.is_not(None),
                    UptimeMonitor.alert_webhook_secret_encrypted.is_not(None),
                ))
                if monitor:
                    await send_webhook(
                        monitor.alert_webhook_url, decrypt_secret(monitor.alert_webhook_secret_encrypted),
                        "scan.regression", str(scan.id), {
                            "project_id": str(scan.project_id), "score": scan.overall_score,
                            "previous_scan_id": str(previous.id), "comparison": comparison,
                        },
                    )
    if scan.project_id:
        event = "scan.completed" if scan.status == ScanStatus.completed else "scan.failed"
        webhooks = list((await session.scalars(select(ProjectWebhook).where(
            ProjectWebhook.project_id == scan.project_id, ProjectWebhook.enabled
        ))).all())
        for webhook in webhooks:
            if event in (webhook.events or []):
                try:
                    await send_webhook(webhook.url, decrypt_secret(webhook.secret_encrypted), event, str(scan.id), {
                        "project_id": str(scan.project_id), "scan_id": str(scan.id),
                        "status": scan.status.value, "score": scan.overall_score,
                    })
                except Exception:
                    # Delivery failures must never fail or roll back a completed scan.
                    pass
    await session.commit()
