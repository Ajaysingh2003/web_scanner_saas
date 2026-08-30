import re
from urllib.parse import urlparse

from app.models import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


SENSITIVE_NAME = re.compile(r"token|jwt|auth|session|secret|api[_-]?key|refresh|access", re.I)
SENSITIVE_VALUE = re.compile(
    r"(?:\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b|"
    r"\b(?:sk|pk|rk|ghp|AIza)[_-][A-Za-z0-9_-]{12,}\b)", re.I
)


class BrowserStorageScanner(BaseScanner):
    name, category = "browser_storage", "vulnerability"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return []
        origin = urlparse(target).netloc
        findings: list[FindingResult] = []
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True, args=["--no-sandbox"])
            browser_context = await browser.new_context(ignore_https_errors=bool(context.ssl_error))

            async def route_handler(route):
                if urlparse(route.request.url).netloc not in {"", origin}:
                    await route.abort()
                else:
                    await route.continue_()

            await browser_context.route("**/*", route_handler)
            page = await browser_context.new_page()
            try:
                await page.goto(target, wait_until="domcontentloaded", timeout=10_000)
                storage = await page.evaluate("""() => ({
                    local: Object.entries(localStorage),
                    session: Object.entries(sessionStorage)
                })""")
                for storage_name in ("local", "session"):
                    for key, value in storage.get(storage_name, []):
                        if not SENSITIVE_NAME.search(str(key)) and not SENSITIVE_VALUE.search(str(value)):
                            continue
                        token_type = "token-like value" if SENSITIVE_VALUE.search(str(value)) else "sensitive key"
                        findings.append(FindingResult(
                            Severity.high if storage_name == "local" else Severity.medium,
                            f"Authentication data stored in {storage_name}Storage",
                            f"The page stores a {token_type} in browser storage, where JavaScript running in the origin can read it.",
                            {"storage": storage_name, "key_redacted": str(key)[:80], "page_path": urlparse(page.url).path},
                            "Prefer Secure, HttpOnly, SameSite cookies for session credentials and keep long-lived tokens out of JavaScript-readable storage.",
                            confidence=0.9 if SENSITIVE_VALUE.search(str(value)) else 0.78,
                        ))
            except Exception:
                return []
            finally:
                await browser_context.close()
                await browser.close()
        return findings
