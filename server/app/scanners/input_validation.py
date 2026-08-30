import html
import re
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from bs4 import BeautifulSoup

from app.models import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


PROBE = "aetherscan-input-probe-7f3c"


class InputValidationScanner(BaseScanner):
    name, category = "input_validation", "vulnerability"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await context.http.get(target)
        if response.status_code >= 500:
            return []
        soup = BeautifulSoup(response.text[:1_000_000], "html.parser")
        findings: list[FindingResult] = []
        weak_controls = []
        for form_index, form in enumerate(soup.find_all("form")):
            for control in form.find_all(["input", "textarea", "select"]):
                control_type = (control.get("type") or "text").lower()
                if control_type in {"hidden", "submit", "button", "reset", "file"}:
                    continue
                if not any(control.get(attribute) for attribute in ("maxlength", "pattern", "minlength")):
                    weak_controls.append({
                        "form_index": form_index,
                        "name": control.get("name") or control.get("id") or "unnamed",
                        "type": control_type,
                    })
        if weak_controls:
            findings.append(FindingResult(
                Severity.low,
                "Public form inputs lack visible validation constraints",
                "Some user-controlled fields do not declare length or pattern constraints. Client-side attributes cannot replace server-side validation, but their absence is a useful review signal.",
                {"page_path": urlparse(target).path, "affected_controls": weak_controls[:20]},
                "Validate every input on the server with allowlists, length limits, canonicalization, and context-aware output encoding; add client hints only as usability improvements.",
                confidence=0.72,
            ))

        query = parse_qsl(urlparse(target).query, keep_blank_values=True)
        if query:
            probe_url = urlunparse(urlparse(target)._replace(query=urlencode([
                (key, PROBE if index == 0 else value) for index, (key, value) in enumerate(query)
            ])))
            probe_response = await context.http.get(probe_url)
            if PROBE in html.unescape(probe_response.text[:1_000_000]):
                findings.append(FindingResult(
                    Severity.medium,
                    "Query input is reflected in the HTML response",
                    "A harmless marker supplied in a URL parameter was returned in the page response. This can become cross-site scripting or content injection when output encoding is incomplete.",
                    {"page_path": urlparse(target).path, "parameter": query[0][0], "probe_redacted": True},
                    "Apply context-aware output encoding, avoid injecting raw query data into HTML or scripts, and add an automated reflection/XSS regression test.",
                    confidence=0.86,
                ))
        return findings
