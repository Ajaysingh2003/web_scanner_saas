import asyncio
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import SessionFactory
from app.core.http import fetch_with_ssl_fallback, http_clients
from app.models import Finding, Scan, ScanProgress, ScanStatus, ScannerRun, ScannerRunStatus
from app.scanners.base import ScanContext
from app.scanners.registry import get_scanners
from app.services.scoring import score_breakdown


async def run_scan(scan_id, session: AsyncSession) -> None:
    scan = await session.get(Scan, scan_id)
    if scan is None:
        return
    scanners = get_scanners()
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
    timeout = httpx.Timeout(settings.scanner_timeout_seconds)
    headers = {"User-Agent": settings.user_agent}
    async with http_clients(timeout=timeout, limits=limits, headers=headers) as (verified, insecure):
        _probe, ssl_error = await fetch_with_ssl_fallback(verified, insecure, scan.url)
        scanner_http = insecure if ssl_error else verified
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
                try:
                    findings = await asyncio.wait_for(
                        scanner.scan(scan.url, ScanContext(scanner_http, ssl_error=ssl_error)),
                        timeout=settings.scanner_timeout_seconds,
                    )
                    await mark_scanner(scanner.name, ScannerRunStatus.completed, len(findings))
                    return scanner, findings, False, None
                except Exception as exc:
                    error = f"{type(exc).__name__}: {exc}"[:2000]
                    await mark_scanner(scanner.name, ScannerRunStatus.failed, error=error)
                    return scanner, [], True, error
        results = await asyncio.gather(*(execute(scanner) for scanner in scanners))
    for scanner, findings, _failed, _error in results:
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
        "scanner_failures": [
            {"scanner": scanner.name, "error": error}
            for scanner, _findings, failed, error in results if failed
        ],
    }
    scan.status = ScanStatus.failed if all(failed for _, _, failed, _ in results) else ScanStatus.completed
    scan.finished_at = datetime.now(timezone.utc)
    await session.commit()
