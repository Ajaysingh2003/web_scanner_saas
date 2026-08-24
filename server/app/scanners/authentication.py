import asyncio
import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin, urlparse

from app.core.secrets import decrypt_secret, encrypt_secret
from app.models import OtpSession, OtpSessionStatus, Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext
from app.services.webhooks import send_webhook


AUTH_COOKIE_RE = re.compile(r"session|auth|token|sid|refresh|access", re.I)
TOKEN_URL_RE = re.compile(r"(?:access_token|refresh_token|id_token|token|code)=", re.I)


class AuthenticationFlowScanner(BaseScanner):
    name, category = "authentication_flow", "vulnerability"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        options = context.security_test or {}
        flow = json.loads(decrypt_secret(options["flow_encrypted"]))
        account = json.loads(decrypt_secret(options["test_account_encrypted"]))
        rate_limit_probe = json.loads(decrypt_secret(options["rate_limit_probe_encrypted"])) \
            if options.get("rate_limit_probe_encrypted") else {"enabled": False}
        webhook_secret = decrypt_secret(options["webhook_secret_encrypted"])
        webhook_url = options["webhook_url"]
        findings: list[FindingResult] = []
        await self._event(webhook_url, webhook_secret, "scan.started", context, {
            "scan_type": "authentication_flow",
            "flow_type": flow.get("type"),
        })
        try:
            from playwright.async_api import TimeoutError as PlaywrightTimeoutError
            from playwright.async_api import async_playwright
        except ImportError:
            await self._event(webhook_url, webhook_secret, "scan.failed", context, {
                "reason": "playwright_unavailable",
            })
            return [self._finding("Authentication worker is missing Playwright.", "Install the browser runtime in the worker image.", Severity.high)]

        origin = urlparse(target).netloc
        last_otp: str | None = None
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True, args=["--no-sandbox"])
            browser_context = await browser.new_context(ignore_https_errors=bool(context.ssl_error))

            async def route_handler(route):
                host = urlparse(route.request.url).netloc
                if host and host != origin:
                    await route.abort()
                else:
                    await route.continue_()

            await browser_context.route("**/*", route_handler)
            page = await browser_context.new_page()
            await self._event(webhook_url, webhook_secret, "step.started", context, {
                "step_index": 0, "action": "browser_opened"
            })
            try:
                if rate_limit_probe.get("enabled"):
                    findings.extend(await self._run_rate_limit_probe(
                        browser_context, target, account, rate_limit_probe,
                        context, webhook_url, webhook_secret,
                    ))
                for index, step in enumerate(flow.get("steps", [])):
                    await self._event(webhook_url, webhook_secret, "step.started", context, {
                        "step_index": index, "action": step.get("action")
                    })
                    last_otp = await self._execute_step(
                        page, step, index, target, account, last_otp, context,
                        webhook_url, webhook_secret, PlaywrightTimeoutError,
                    )
                    await self._event(webhook_url, webhook_secret, "step.completed", context, {
                        "step_index": index, "action": step.get("action")
                    })
                findings.extend(self._cookie_findings(await browser_context.cookies()))
                if TOKEN_URL_RE.search(page.url):
                    findings.append(self._finding(
                        "Authentication token appears in the browser URL.",
                        "Use secure server-side callbacks or fragments with immediate token exchange; never expose long-lived tokens in URLs.",
                        Severity.high,
                        {"url_redacted": True},
                    ))
                await self._event(webhook_url, webhook_secret, "scan.completed", context, {
                    "findings_count": len(findings),
                })
            except Exception as error:
                await self._event(webhook_url, webhook_secret, "scan.failed", context, {
                    "reason": type(error).__name__,
                })
                raise
            finally:
                await browser_context.close()
                await browser.close()
        return findings

    async def _run_rate_limit_probe(self, browser_context, target: str, account: dict,
                                    probe: dict, context: ScanContext,
                                    webhook_url: str, webhook_secret: str) -> list[FindingResult]:
        """Submit a small, explicit set of invalid credentials and inspect throttle signals."""
        identifier_from = probe.get("identifier_from", "test_account.email")
        identifier = account.get(identifier_from.split(".", 1)[1])
        wrong_password = probe.get("wrong_password")
        if not identifier or not wrong_password:
            raise ValueError("rate_limit_probe requires a configured test account identifier and wrong password")
        if account.get("password") and wrong_password == account["password"]:
            raise ValueError("rate_limit_probe wrong_password must differ from the test account password")

        start_url = urljoin(target, probe.get("start_url") or "/")
        if urlparse(start_url).netloc != urlparse(target).netloc:
            raise ValueError("rate_limit_probe cannot navigate outside the project origin")
        endpoint_path = probe.get("endpoint_path")
        attempts = int(probe.get("attempts", 5))
        delay_ms = int(probe.get("delay_ms", 500))
        await self._event(webhook_url, webhook_secret, "rate_limit_probe.started", context, {
            "attempts_requested": attempts,
            "delay_ms": delay_ms,
            "endpoint_path": endpoint_path,
        })

        page = await browser_context.new_page()
        status_codes: list[int] = []
        response_paths: list[str] = []
        rate_limit_signal = None
        responses_observed = 0
        try:
            for attempt in range(attempts):
                await page.goto(start_url, wait_until="domcontentloaded", timeout=10_000)
                responses = []

                def capture_response(response):
                    request = response.request
                    if request.method.upper() in {"POST", "PUT", "PATCH"}:
                        if urlparse(response.url).netloc == urlparse(target).netloc:
                            responses.append(response)

                page.on("response", capture_response)
                try:
                    await page.locator(probe["identifier_selector"]).fill(str(identifier))
                    await page.locator(probe["password_selector"]).fill(str(wrong_password))
                    await page.locator(probe["submit_selector"]).click(timeout=10_000)
                    await page.wait_for_timeout(delay_ms)
                finally:
                    page.remove_listener("response", capture_response)

                selected = self._select_probe_response(responses, endpoint_path)
                if selected is None:
                    continue
                responses_observed += 1
                status_codes.append(selected.status)
                response_path = urlparse(selected.url).path
                if response_path not in response_paths:
                    response_paths.append(response_path)
                signal = await self._rate_limit_signal(selected)
                if signal:
                    rate_limit_signal = signal
                    break
        finally:
            await page.close()

        await self._event(webhook_url, webhook_secret, "rate_limit_probe.completed", context, {
            "attempts_completed": len(status_codes),
            "responses_observed": responses_observed,
            "status_codes": status_codes,
            "rate_limit_signal": rate_limit_signal,
        })
        if rate_limit_signal or not responses_observed:
            return []
        return [self._finding(
            "Authentication endpoint did not enforce an observable rate limit.",
            "Apply per-account and per-IP failed-login throttling with exponential backoff, a safe account-lock policy, and monitoring. Return 429 with Retry-After or require a CAPTCHA/step-up challenge after repeated failures.",
            Severity.high,
            {
                "probe_type": "bounded_invalid_credentials",
                "attempts_completed": len(status_codes),
                "responses_observed": responses_observed,
                "status_codes": status_codes,
                "response_paths": response_paths,
                "rate_limit_signal_observed": False,
            },
        )]

    @staticmethod
    def _select_probe_response(responses: list, endpoint_path: str | None):
        if endpoint_path:
            matching = [response for response in responses if urlparse(response.url).path == endpoint_path]
            return matching[-1] if matching else None
        return responses[-1] if responses else None

    @staticmethod
    async def _rate_limit_signal(response) -> str | None:
        headers = {key.lower(): value for key, value in response.headers.items()}
        if response.status in {423, 429}:
            return f"http_{response.status}"
        if headers.get("retry-after") or headers.get("x-ratelimit-remaining") == "0":
            return "rate_limit_headers"
        try:
            body = (await response.text())[:20_000].lower()
        except Exception:
            body = ""
        if re.search(r"captcha|too many attempts|too many requests|temporarily blocked|account locked", body):
            return "challenge_or_lockout_signal"
        path = urlparse(response.url).path.lower()
        if re.search(r"captcha|challenge|lock(?:ed|out)", path):
            return "challenge_or_lockout_redirect"
        return None

    async def _execute_step(self, page, step: dict, index: int, target: str,
                            account: dict, last_otp: str | None, context: ScanContext,
                            webhook_url: str, webhook_secret: str, timeout_error):
        action = step.get("action")
        selector = step.get("selector")
        timeout = 10_000
        if action == "open_url":
            url = urljoin(target, step.get("url") or target)
            if urlparse(url).netloc != urlparse(target).netloc:
                raise ValueError("Authentication flow cannot navigate outside the project origin")
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)
        elif action == "fill":
            if not selector:
                raise ValueError("fill requires selector")
            await page.locator(selector).fill(self._resolve_value(step, account))
        elif action == "click":
            await page.locator(selector).click(timeout=timeout)
        elif action == "wait_for_selector":
            await page.locator(selector).wait_for(timeout=timeout)
        elif action == "wait_for_otp":
            last_otp = await self._wait_for_otp(page, step, context, webhook_url, webhook_secret)
        elif action == "fill_otp":
            if not last_otp:
                raise ValueError("fill_otp requires a preceding wait_for_otp step")
            await page.locator(selector).fill(last_otp)
        elif action == "assert_url_contains":
            if step.get("text") not in page.url:
                raise AssertionError("Expected URL fragment was not present")
        elif action == "assert_text":
            await page.get_by_text(step.get("text") or "", exact=False).wait_for(timeout=timeout)
        else:
            raise ValueError(f"Unsupported authentication action: {action}")
        return last_otp

    async def _wait_for_otp(self, page, step: dict, context: ScanContext,
                            webhook_url: str, webhook_secret: str) -> str:
        if context.session_factory is None:
            raise RuntimeError("OTP session storage is not configured")
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=3)
        async with context.session_factory() as session:
            otp_session = OtpSession(
                scan_id=uuid.UUID(context.security_test["scan_id"]),
                project_id=uuid.UUID(context.security_test["project_id"]),
                status=OtpSessionStatus.waiting_for_otp.value,
                prompt=step.get("prompt") or "Enter the OTP sent to the test account",
                expires_at=expires_at,
            )
            session.add(otp_session)
            await session.commit()
            await session.refresh(otp_session)
            session_id = str(otp_session.id)
        await self._event(webhook_url, webhook_secret, "otp.required", context, {
            "otp_session_id": session_id,
            "prompt": step.get("prompt") or "Enter the OTP sent to the test account",
            "expires_at": expires_at.isoformat(),
            "step": {"action": "wait_for_otp", "selector": step.get("selector")},
        })
        while datetime.now(timezone.utc) < expires_at:
            await asyncio.sleep(1)
            async with context.session_factory() as session:
                current = await session.get(OtpSession, otp_session.id)
                if not current:
                    break
                if current.status == OtpSessionStatus.submitted.value and current.otp_encrypted:
                    otp = decrypt_secret(current.otp_encrypted)
                    current.otp_encrypted = None
                    current.status = OtpSessionStatus.used.value
                    await session.commit()
                    await self._event(webhook_url, webhook_secret, "otp.received", context, {
                        "otp_session_id": session_id,
                    })
                    return otp
        async with context.session_factory() as session:
            current = await session.get(OtpSession, otp_session.id)
            if current and current.status == OtpSessionStatus.waiting_for_otp.value:
                current.status = OtpSessionStatus.expired.value
                await session.commit()
        raise TimeoutError("OTP session expired")

    @staticmethod
    def _resolve_value(step: dict, account: dict) -> str:
        source = step.get("value_from")
        if source:
            if not source.startswith("test_account."):
                raise ValueError("value_from must reference test_account")
            value = account.get(source.split(".", 1)[1])
            if value is None:
                raise ValueError(f"Missing test account value for {source}")
            return str(value)
        if step.get("value") is None:
            raise ValueError("fill requires value or value_from")
        return str(step["value"])

    @staticmethod
    def _cookie_findings(cookies: list[dict]) -> list[FindingResult]:
        findings = []
        for cookie in cookies:
            if not AUTH_COOKIE_RE.search(cookie.get("name", "")):
                continue
            missing = []
            if not cookie.get("httpOnly"):
                missing.append("HttpOnly")
            if not cookie.get("secure"):
                missing.append("Secure")
            if not cookie.get("sameSite") or cookie.get("sameSite") == "None":
                missing.append("SameSite")
            if missing:
                findings.append(AuthenticationFlowScanner._finding(
                    f"Authentication cookie has weak security attributes: {', '.join(missing)}.",
                    "Set HttpOnly and Secure on session cookies and choose an appropriate SameSite policy.",
                    Severity.medium,
                    {"cookie_name": cookie.get("name"), "missing_attributes": missing},
                ))
        return findings

    @staticmethod
    async def _event(url: str, secret: str, event: str, context: ScanContext, payload: dict) -> None:
        await send_webhook(url, secret, event, context.security_test["scan_id"], payload)

    @staticmethod
    def _finding(title: str, remediation: str, severity: Severity,
                 evidence: dict | None = None) -> FindingResult:
        return FindingResult(
            severity=severity,
            title=title,
            description="Authentication-flow security test detected a potential weakness.",
            evidence=evidence or {},
            remediation=remediation,
            confidence=0.9,
        )
