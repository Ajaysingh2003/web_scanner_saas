import asyncio
import logging
import re
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext

logger = logging.getLogger("scanlyst.scanners.sqli")

def _p(msg: str) -> None:
    print(f"[sqli_scanner] {msg}", flush=True)

ERROR_RE = re.compile(
    r"sql syntax|mysql|mariadb|postgresql|pg_query|sqlite|odbc|ora-\d+|syntax error|invalid query",
    re.I,
)
TEXT_INPUT_TYPES = {"", "text", "email", "number", "search", "url", "tel"}

MAX_CRAWL_ERRORS = 8


@dataclass(slots=True)
class InputTarget:
    url: str
    method: str
    parameter: str
    values: dict[str, str]


@dataclass(slots=True)
class ProbeResponse:
    status: int
    body: str
    elapsed: float


class SqlInjectionScanner(BaseScanner):
    name, category = "sqli_security", "vulnerability"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        scan_id = getattr(context, "scan_id", "unknown")
        log = logger.bind(scan_id=scan_id, target=target) if hasattr(logger, "bind") else logger
        options = context.security_test or {}

        log.info(
            "sqli_scan_started",
            extra={"scan_id": scan_id, "target": target, "options": options},
        )
        _p(f"START scan_id={scan_id} target={target} options={options}")

        try:
            pages = await self._discover_pages(
                target, context, int(options.get("max_pages", 20)), log
            )
        except Exception as exc:
            log.exception(
                "sqli_page_discovery_failed",
                extra={"scan_id": scan_id, "target": target},
            )
            _p(f"FAILED page discovery for {target}: {type(exc).__name__}: {exc}")
            return [self._infra_finding(
                title="SQL injection scan could not crawl the target",
                description=(
                    "The scanner was unable to discover pages to test. This usually means "
                    "the target refused connections, timed out repeatedly, or returned "
                    "non-HTML content for every request. Check application logs for the "
                    "underlying exception."
                ),
            )]

        if not pages:
            log.warning(
                "sqli_no_pages_discovered",
                extra={"scan_id": scan_id, "target": target},
            )
            _p(f"NO PAGES discovered for {target} — nothing to test")
            return [self._infra_finding(
                title="SQL injection scan found no testable pages",
                description=(
                    "The crawler reached the target but found no HTML pages to test "
                    "(all requests errored, returned 4xx/5xx, or non-HTML content types)."
                ),
                severity=Severity.low,
            )]

        try:
            targets = self._discover_inputs(
                pages, bool(options.get("include_post_requests"))
            )
        except Exception as exc:
            log.exception(
                "sqli_input_discovery_failed",
                extra={"scan_id": scan_id, "target": target, "pages_crawled": len(pages)},
            )
            _p(f"FAILED input discovery after crawling {len(pages)} pages: {type(exc).__name__}: {exc}")
            return [self._infra_finding(
                title="SQL injection scan could not parse discovered pages",
                description=(
                    "The scanner crawled the target successfully but failed while parsing "
                    "forms/query parameters out of the HTML. This may indicate malformed "
                    "markup that broke the parser. Check application logs for details."
                ),
            )]

        log.info(
            "sqli_inputs_discovered",
            extra={"scan_id": scan_id, "target": target, "pages": len(pages), "inputs": len(targets)},
        )
        _p(f"DISCOVERED {len(pages)} pages, {len(targets)} testable inputs")

        findings: list[FindingResult] = []
        probe_errors = 0
        semaphore = asyncio.Semaphore(5)

        async def probe_worker(input_target: InputTarget):
            nonlocal probe_errors
            async with semaphore:
                try:
                    return await self._test_target(
                        input_target, context, bool(options.get("include_time_based")), log
                    )
                except Exception as exc:
                    probe_errors += 1
                    log.debug(
                        "sqli_probe_failed",
                        extra={
                            "url": input_target.url,
                            "method": input_target.method,
                            "parameter": input_target.parameter,
                            "error": str(exc),
                        },
                    )
                    return None

        probe_results = await asyncio.gather(*(probe_worker(t) for t in targets))
        for res in probe_results:
            if res:
                _p(f"  -> FINDING: {res.title}")
                findings.append(res)

        if probe_errors:
            log.warning(
                "sqli_probes_completed_with_errors",
                extra={
                    "scan_id": scan_id,
                    "target": target,
                    "total_inputs": len(targets),
                    "failed_inputs": probe_errors,
                },
            )
            _p(f"{probe_errors}/{len(targets)} probes errored out")
            if probe_errors == len(targets) and targets:
                findings.append(self._infra_finding(
                    title="SQL injection probes failed for every discovered input",
                    description=(
                        f"All {len(targets)} discovered inputs errored out during testing "
                        "(network failures, timeouts, or unexpected response formats). "
                        "This scan's results should not be treated as a clean bill of health."
                    ),
                ))

        log.info(
            "sqli_scan_completed",
            extra={
                "scan_id": scan_id,
                "target": target,
                "inputs_tested": len(targets),
                "probe_errors": probe_errors,
                "findings": len(findings),
            },
        )
        _p(f"DONE target={target} tested={len(targets)} errors={probe_errors} findings={len(findings)}")
        return findings

    async def _discover_pages(self, target: str, context: ScanContext,
                              max_pages: int, log=logger) -> list[tuple[str, str]]:
        origin = urlparse(target).netloc
        queue = [target]
        visited: set[str] = set()
        pages: list[tuple[str, str]] = []
        fetch_errors = 0

        while queue and len(pages) < max_pages:
            url = queue.pop(0).split("#", 1)[0]
            if url in visited or urlparse(url).netloc != origin:
                continue
            visited.add(url)

            try:
                response = await asyncio.wait_for(context.http.get(url), timeout=8.0)
            except (asyncio.TimeoutError, Exception) as exc:
                fetch_errors += 1
                log.debug("sqli_page_fetch_failed", extra={"url": url, "error": str(exc)})
                if fetch_errors >= MAX_CRAWL_ERRORS:
                    _p(f"  ABORTING crawl — too many fetch errors ({fetch_errors})")
                    break
                continue

            if response.status_code >= 400:
                continue
            content_type = response.headers.get("content-type", "text/html")
            if "html" not in content_type:
                continue

            html = response.text[:2_000_000]
            pages.append((str(response.url), html))

            try:
                soup = BeautifulSoup(html, "html.parser")
                for link in soup.find_all("a", href=True):
                    candidate = urljoin(str(response.url), link["href"]).split("#", 1)[0]
                    if urlparse(candidate).netloc == origin and candidate not in visited:
                        queue.append(candidate)
            except Exception:
                pass

        return pages

    def _discover_inputs(self, pages: list[tuple[str, str]],
                         include_post_requests: bool) -> list[InputTarget]:
        inputs: list[InputTarget] = []
        seen: set[tuple[str, str, str]] = set()
        for page_url, html in pages:
            parsed = urlparse(page_url)
            query = dict(parse_qsl(parsed.query, keep_blank_values=True))
            for parameter in query:
                key = (page_url, "GET", parameter)
                if key not in seen:
                    seen.add(key)
                    inputs.append(InputTarget(page_url, "GET", parameter, query))
            try:
                soup = BeautifulSoup(html, "html.parser")
            except Exception:
                continue
            for form in soup.find_all("form"):
                method = (form.get("method") or "get").upper()
                if method not in {"GET", "POST"} or (method == "POST" and not include_post_requests):
                    continue
                action = urljoin(page_url, form.get("action") or page_url)
                values: dict[str, str] = {}
                for field in form.find_all(["input", "textarea", "select"]):
                    name = field.get("name")
                    input_type = (field.get("type") or "").lower()
                    if name and input_type in TEXT_INPUT_TYPES:
                        values[name] = field.get("value") or "test"
                for parameter in values:
                    key = (action, method, parameter)
                    if key not in seen:
                        seen.add(key)
                        inputs.append(InputTarget(action, method, parameter, values))
        return inputs[:60]

    async def _test_target(self, target: InputTarget, context: ScanContext,
                           include_time_based: bool, log=logger) -> FindingResult | None:
        baseline = await self._send(context, target, target.values, log)
        if baseline is None:
            return None

        true_values = dict(target.values)
        false_values = dict(target.values)
        error_values = dict(target.values)
        union_values = dict(target.values)
        true_values[target.parameter] = self._payload(target.values[target.parameter], "boolean_true")
        false_values[target.parameter] = self._payload(target.values[target.parameter], "boolean_false")
        error_values[target.parameter] = "'"
        union_values[target.parameter] = self._payload(target.values[target.parameter], "union")

        true_response, false_response, error_response = await asyncio.gather(
            self._send(context, target, true_values, log),
            self._send(context, target, false_values, log),
            self._send(context, target, error_values, log),
        )

        if error_response and ERROR_RE.search(error_response.body):
            return self._finding(target, "error-based", error_response.status,
                                 "A database error signature appeared after a quote probe.", 0.9)
        if true_response and false_response and self._responses_diverge(true_response, false_response):
            return self._finding(target, "boolean-blind", true_response.status,
                                 "Paired true/false probes produced materially different responses.", 0.8)

        union_response = await self._send(context, target, union_values, log)
        if union_response and self._responses_diverge(baseline, union_response):
            return self._finding(target, "union-based", union_response.status,
                                 "A safe UNION NULL probe produced a materially different response.", 0.65)

        if include_time_based:
            time_values = dict(target.values)
            time_values[target.parameter] = self._payload(target.values[target.parameter], "time")
            time_response = await self._send(context, target, time_values, log)
            if time_response and time_response.elapsed - baseline.elapsed > 1.5:
                return self._finding(target, "time-blind", time_response.status,
                                     "The time-based probe produced a material response delay.", 0.7)

        return None

    @staticmethod
    def _payload(original: str, technique: str) -> str:
        if technique == "boolean_true":
            return f"{original}' AND '1'='1'-- "
        if technique == "boolean_false":
            return f"{original}' AND '1'='2'-- "
        if technique == "time":
            return f"{original}' OR SLEEP(2)-- "
        if technique == "union":
            return f"{original}' UNION SELECT NULL-- "
        return original

    async def _send(self, context: ScanContext, target: InputTarget,
                    values: dict[str, str], log=logger) -> ProbeResponse | None:
        started = time.monotonic()
        try:
            if target.method == "GET":
                parsed = urlparse(target.url)
                url = urlunparse(parsed._replace(query=urlencode(values)))
                response = await asyncio.wait_for(context.http.get(url), timeout=10.0)
            else:
                response = await asyncio.wait_for(context.http.post(target.url, data=values), timeout=10.0)
        except Exception:
            return None
        return ProbeResponse(response.status_code, response.text[:1_000_000], time.monotonic() - started)

    @staticmethod
    def _responses_diverge(true_response: ProbeResponse, false_response: ProbeResponse) -> bool:
        if true_response.status != false_response.status:
            return True
        difference = abs(len(true_response.body) - len(false_response.body))
        return difference > max(200, int(max(len(true_response.body), len(false_response.body)) * 0.25))

    @staticmethod
    def _finding(target: InputTarget, technique: str, status: int,
                 description: str, confidence: float) -> FindingResult:
        return FindingResult(
            severity=Severity.high,
            title=f"Potential SQL injection ({technique})",
            description=description,
            evidence={
                "url": target.url,
                "method": target.method,
                "parameter": target.parameter,
                "technique": technique,
                "status_code": status,
                "payloads_redacted": True,
            },
            remediation=(
                "Use parameterized queries or a trusted query builder, validate input by type and length, "
                "and add regression tests for this parameter."
            ),
            confidence=confidence,
        )

    @staticmethod
    def _infra_finding(title: str, description: str, severity: Severity = Severity.low) -> FindingResult:
        return FindingResult(
            severity=severity,
            title=title,
            description=description,
            evidence={"scanner": "sqli_security"},
            remediation=(
                "Re-run the audit once the target is reachable, or check the scan worker logs "
                "for the specific exception if this persists."
            ),
            confidence=1.0,
        )
