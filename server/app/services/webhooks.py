import asyncio
import hashlib
import hmac
import json
from datetime import datetime, timezone

import httpx


def webhook_signature(secret: str, timestamp: str, body: bytes) -> str:
    signed = f"{timestamp}.".encode() + body
    digest = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={digest}"


async def send_webhook(url: str, secret: str, event: str, scan_id: str,
                      payload: dict, attempts: int = 3) -> bool:
    body = json.dumps({
        "event": event,
        "scan_id": scan_id,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        **payload,
    }, separators=(",", ":"), sort_keys=True).encode()
    for attempt in range(attempts):
        timestamp = str(int(datetime.now(timezone.utc).timestamp()))
        try:
            async with httpx.AsyncClient(timeout=8, follow_redirects=False) as client:
                response = await client.post(url, content=body, headers={
                    "content-type": "application/json",
                    "x-scanlyst-signature": webhook_signature(secret, timestamp, body),
                    "x-scanlyst-event": event,
                })
            if 200 <= response.status_code < 300:
                return True
        except httpx.HTTPError:
            pass
        if attempt < attempts - 1:
            await asyncio.sleep(2 ** attempt)
    return False
