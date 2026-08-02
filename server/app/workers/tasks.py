from datetime import datetime, timedelta, timezone

from app.core.database import SessionFactory
from app.services.scanner_orchestrator import run_scan as execute_scan
from arq.connections import RedisSettings
from app.core.config import get_settings
from arq import cron
from sqlalchemy import select
from app.models import Project, Scan, ScanProgress, ScanStatus, ScannerRun, ScannerRunStatus
from app.scanners.registry import get_scanners


async def run_scan(ctx, scan_id: str):
    async with SessionFactory() as session:
        await execute_scan(scan_id, session)


async def enqueue_due_scans(ctx):
    now = datetime.now(timezone.utc)
    scan_ids: list[str] = []
    async with SessionFactory() as session:
        projects = (await session.scalars(
            select(Project).where(Project.schedule_enabled, Project.schedule_next_run_at <= now)
            .with_for_update(skip_locked=True).limit(100)
        )).all()
        scanners = get_scanners()
        for project in projects:
            target = getattr(project, f"{project.schedule_environment}_url", None)
            project.schedule_next_run_at = now + timedelta(minutes=project.schedule_interval_minutes)
            if not target:
                continue
            scan = Scan(url=target, owner_user_id=project.owner_user_id, project_id=project.id,
                        environment=project.schedule_environment, status=ScanStatus.queued,
                        metadata_={"project_settings": project.settings or {}, "scheduled": True},
                        progress=ScanProgress(total_scanners=len(scanners)),
                        scanner_runs=[ScannerRun(scanner_name=scanner.name, category=scanner.category,
                                                 status=ScannerRunStatus.queued) for scanner in scanners])
            session.add(scan)
            await session.flush()
            scan_ids.append(str(scan.id))
        await session.commit()
    redis = ctx["redis"]
    for scan_id in scan_ids:
        await redis.enqueue_job("run_scan", scan_id)


class WorkerSettings:
    functions = [run_scan]
    max_jobs = 2
    cron_jobs = [cron(enqueue_due_scans, minute=set(range(60)))]
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
