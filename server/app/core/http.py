from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import httpx


def is_certificate_verification_error(error: BaseException) -> bool:
    message = str(error).lower()
    return "certificate_verify_failed" in message or "certificate verify failed" in message


@asynccontextmanager
async def http_clients(
    *,
    timeout: httpx.Timeout,
    limits: httpx.Limits | None = None,
    headers: dict[str, str],
) -> AsyncIterator[tuple[httpx.AsyncClient, httpx.AsyncClient]]:
    """Yield verified and insecure clients for certificate-tolerant scanning.

    The insecure client is only used to continue passive inspection after the
    verified client reports a certificate verification failure.
    """
    effective_limits = limits or httpx.Limits(max_connections=10, max_keepalive_connections=5)
    async with (
        httpx.AsyncClient(timeout=timeout, limits=effective_limits, headers=headers,
                          follow_redirects=True, verify=True) as verified,
        httpx.AsyncClient(timeout=timeout, limits=effective_limits, headers=headers,
                          follow_redirects=True, verify=False) as insecure,
    ):
        yield verified, insecure



async def fetch_with_ssl_fallback(
    verified: httpx.AsyncClient,
    insecure: httpx.AsyncClient,
    url: str,
) -> tuple[httpx.Response | None, str | None]:
    """Probe a URL with verification, then retry only certificate failures."""
    try:
        return await verified.get(url), None
    except Exception as error:
        if is_certificate_verification_error(error):
            try:
                return await insecure.get(url), str(error)
            except Exception as insecure_err:
                return None, str(insecure_err)
        return None, str(error)
