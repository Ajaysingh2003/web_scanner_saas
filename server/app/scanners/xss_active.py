import json
import re
import uuid
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


class ActiveXssScanner(BaseScanner):
    name, category = "xss_active", "vulnerability"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        try:
            from playwright.async_api import TimeoutError as PlaywrightTimeoutError
            from playwright.async_api import async_playwright
        except ImportError:
            return [self._finding(
                "playwright_unavailable", target, "worker", False, 1.0,
            )]

        options = context.security_test or {}
        max_pages = min(int(options.get("max_pages", 20)), 15)
        include_post = bool(options.get("include_post_requests"))
        origin = urlparse(target).netloc
        findings: list[FindingResult] = []

        async with async_playwright() as playwright:
            try:
                browser = await playwright.chromium.launch(headless=True, args=["--no-sandbox"])
            except Exception as error:
                return [self._finding(
                    "playwright_unavailable", target, f"worker:{type(error).__name__}", False, 1.0,
                )]
            browser_context = await browser.new_context(ignore_https_errors=bool(context.ssl_error))

            async def route_handler(route):
                request_host = urlparse(route.request.url).netloc
                if request_host and request_host != origin:
                    await route.abort()
                else:
                    await route.continue_()

            await browser_context.route("**/*", route_handler)
            page = await browser_context.new_page()
            try:
                pages = await self._discover_pages(page, target, origin, max_pages, PlaywrightTimeoutError)
                if context.security_test_runtime is not None:
                    context.security_test_runtime.update({
                        "browser": "chromium",
                        "browser_execution": True,
                        "pages_discovered": len(pages),
                        "page_limit": max_pages,
                        "same_origin_only": True,
                    })
                for page_url in pages:
                    findings.extend(await self._test_query_parameters(
                        page, page_url, PlaywrightTimeoutError
                    ))
                    fragment_finding = await self._test_fragment(page, page_url, PlaywrightTimeoutError)
                    if fragment_finding:
                        findings.append(fragment_finding)
                    if include_post:
                        findings.extend(await self._test_forms(
                            page, page_url, PlaywrightTimeoutError
                        ))
            finally:
                await browser_context.close()
                await browser.close()
        return findings[:50]

    async def _test_fragment(self, page, page_url: str, timeout_error) -> FindingResult | None:
        token = f"scanlyst-{uuid.uuid4().hex[:12]}"
        parsed = urlparse(page_url)
        fragment_url = urlunparse(parsed._replace(fragment=self._payload(token)))
        result = await self._navigate_and_verify(page, fragment_url, token, timeout_error)
        if result:
            return self._finding("dom_fragment", fragment_url, "location.hash", result, 0.9 if result is True else 0.65)
        return None

    async def _discover_pages(self, page, target: str, origin: str, max_pages: int,
                              timeout_error) -> list[str]:
        queue = [target]
        visited: set[str] = set()
        pages: list[str] = []
        while queue and len(pages) < max_pages:
            url = queue.pop(0).split("#", 1)[0]
            if url in visited or urlparse(url).netloc != origin:
                continue
            visited.add(url)
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=5_000)
                await page.wait_for_timeout(100)
            except (timeout_error, Exception):
                continue
            pages.append(page.url)
            try:
                links = await page.locator("a[href]").evaluate_all(
                    "links => links.map(link => link.href)"
                )
                for link in links:
                    candidate = link.split("#", 1)[0]
                    if urlparse(candidate).netloc == origin and candidate not in visited:
                        queue.append(candidate)
            except Exception:
                pass
        return pages

    async def _test_query_parameters(self, page, page_url: str, timeout_error) -> list[FindingResult]:
        parsed = urlparse(page_url)
        parameters = dict(parse_qsl(parsed.query, keep_blank_values=True))
        findings: list[FindingResult] = []
        for parameter in list(parameters)[:6]:
            token = f"scanlyst-{uuid.uuid4().hex[:12]}"
            payload = self._payload(token)
            values = dict(parameters)
            values[parameter] = payload
            test_url = urlunparse(parsed._replace(query=urlencode(values)))
            result = await self._navigate_and_verify(page, test_url, token, timeout_error)
            if result:
                findings.append(self._finding("reflected", test_url, parameter, result, 0.95))
        return findings

    async def _test_forms(self, page, page_url: str, timeout_error) -> list[FindingResult]:
        findings: list[FindingResult] = []
        try:
            await page.goto(page_url, wait_until="domcontentloaded", timeout=5_000)
            forms = await page.locator("form").evaluate_all("""
                forms => forms.map((form, index) => ({
                    index,
                    method: (form.method || 'get').toUpperCase(),
                    fields: Array.from(form.elements)
                        .filter(field => field.name && !['hidden', 'submit', 'button', 'file', 'password'].includes((field.type || '').toLowerCase()))
                        .map(field => ({name: field.name, type: field.type || 'text'}))
                }))
            """)
        except (timeout_error, Exception):
            return findings
        for form in forms[:5]:
            if form["method"] != "POST":
                continue
            for field in form["fields"][:5]:
                token = f"scanlyst-{uuid.uuid4().hex[:12]}"
                selector = f"form:nth-of-type({form['index'] + 1}) [name={json.dumps(field['name'])}]"
                try:
                    await page.locator(selector).fill(self._payload(token))
                    await page.locator(f"form:nth-of-type({form['index'] + 1})").evaluate("form => form.submit()")
                    await page.wait_for_load_state("domcontentloaded", timeout=5_000)
                    await page.wait_for_timeout(150)
                    executed = await page.evaluate("token => window.__SCANLYST_XSS__ === token", token)
                    reflected = token in await page.content()
                    if executed or reflected:
                        findings.append(self._finding(
                            "stored_or_reflected", page.url, field["name"], executed, 0.9 if executed else 0.65
                        ))
                except Exception:
                    continue
        return findings

    async def _navigate_and_verify(self, page, url: str, token: str, timeout_error) -> bool | None:
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=5_000)
            await page.wait_for_timeout(150)
            executed = await page.evaluate("token => window.__SCANLYST_XSS__ === token", token)
            return True if executed else (token in await page.content())
        except (timeout_error, Exception):
            return None

    @staticmethod
    def _payload(token: str) -> str:
        return f'"><svg onload="window.__SCANLYST_XSS__={json.dumps(token)}"></svg>'

    @staticmethod
    def _finding(technique: str, url: str, parameter: str, executed: bool | str,
                 confidence: float) -> FindingResult:
        if technique in {"playwright_unavailable", "playwright_runtime_unavailable"}:
            return FindingResult(
                severity=Severity.high,
                title="Active XSS scanner is unavailable",
                description="The security worker does not have the Playwright browser runtime installed.",
                evidence={"worker": parameter, "browser_runtime": "playwright_chromium"},
                remediation="Install the Playwright Chromium runtime in the worker image and rerun the active XSS scan.",
                confidence=confidence,
            )
        is_executed = executed is True
        return FindingResult(
            severity=Severity.critical if is_executed else Severity.high,
            title=("Confirmed XSS execution" if is_executed else "Potential reflected XSS"),
            description=(
                "The browser executed a controlled same-origin XSS canary."
                if is_executed else
                "The controlled XSS canary was reflected into the response without confirmed browser execution."
            ),
            evidence={
                "url": url,
                "parameter": parameter,
                "technique": technique,
                "canary_redacted": True,
                "browser_execution_confirmed": is_executed,
            },
            remediation="Contextually encode untrusted output, use framework escaping, sanitize trusted HTML, and add a restrictive Content Security Policy.",
            confidence=confidence,
        )
