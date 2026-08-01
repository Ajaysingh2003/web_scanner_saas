from app.core.database import SessionFactory
from app.services.scanner_orchestrator import run_scan as execute_scan
from arq.connections import RedisSettings
from app.core.config import get_settings


async def run_scan(ctx, scan_id: str):
    async with SessionFactory() as session:
        await execute_scan(scan_id, session)


class WorkerSettings:
    functions = [run_scan]
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
