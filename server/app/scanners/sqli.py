import asyncio
import re
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


ERROR_RE = re.compile(
    r"sql syntax|mysql|mariadb|postgresql|pg_query|sqlite|odbc|ora-\d+|syntax error|invalid query",
    re.I,
)
TEXT_INPUT_TYPES = {"", "text", "email", "number", "search", "url", "tel"}


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
        options = context.security_test or {}
        pages = await self._discover_pages(target, context, int(options.get("max_pages", 25)))
        targets = self._discover_inputs(
            pages, bool(options.get("include_post_requests"))
        )
        findings: list[FindingResult] = []
        for input_target in targets:
            result = await self._test_target(
                input_target, context, bool(options.get("include_time_based"))
            )
            if result:
                findings.append(result)
        return findings

    async def _discover_pages(self, target: str, context: ScanContext,
                              max_pages: int) -> list[tuple[str, str]]:
        origin = urlparse(target).netloc
        queue = [target]
        visited: set[str] = set()
        pages: list[tuple[str, str]] = []
        while queue and len(pages) < max_pages:
            url = queue.pop(0).split("#", 1)[0]
            if url in visited or urlparse(url).netloc != origin:
                continue
            visited.add(url)
            try:
                response = await context.http.get(url)
            except Exception:
                continue
            if response.status_code >= 400 or "html" not in response.headers.get("content-type", "text/html"):
                continue
            html = response.text[:2_000_000]
            pages.append((str(response.url), html))
            soup = BeautifulSoup(html, "html.parser")
            for link in soup.find_all("a", href=True):
                candidate = urljoin(str(response.url), link["href"]).split("#", 1)[0]
                if urlparse(candidate).netloc == origin and candidate not in visited:
                    queue.append(candidate)
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
            soup = BeautifulSoup(html, "html.parser")
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
        return inputs[:100]

    async def _test_target(self, target: InputTarget, context: ScanContext,
                           include_time_based: bool) -> FindingResult | None:
        baseline = await self._send(context, target, target.values)
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
            self._send(context, target, true_values),
            self._send(context, target, false_values),
            self._send(context, target, error_values),
        )
        if error_response and ERROR_RE.search(error_response.body):
            return self._finding(target, "error-based", error_response.status,
                                 "A database error signature appeared after a quote probe.", 0.9)
        if true_response and false_response and self._responses_diverge(true_response, false_response):
            return self._finding(target, "boolean-blind", true_response.status,
                                 "Paired true/false probes produced materially different responses.", 0.8)
        union_response = await self._send(context, target, union_values)
        if union_response and self._responses_diverge(baseline, union_response):
            return self._finding(target, "union-based", union_response.status,
                                 "A safe UNION NULL probe produced a materially different response.", 0.65)
        if include_time_based:
            time_values = dict(target.values)
            time_values[target.parameter] = self._payload(target.values[target.parameter], "time")
            time_response = await self._send(context, target, time_values)
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
                    values: dict[str, str]) -> ProbeResponse | None:
        started = time.monotonic()
        try:
            if target.method == "GET":
                parsed = urlparse(target.url)
                url = urlunparse(parsed._replace(query=urlencode(values)))
                response = await context.http.get(url)
            else:
                response = await context.http.post(target.url, data=values)
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
