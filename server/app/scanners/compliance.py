import asyncio
import re
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


LEGAL_PATHS = (
    "/privacy",
    "/privacy-policy",
    "/legal/privacy",
    "/terms",
    "/terms-of-service",
    "/terms-and-conditions",
    "/cookie-policy",
    "/cookies",
)
PRIVACY_RE = re.compile(r"privacy|data protection|personal data", re.I)
TERMS_RE = re.compile(r"terms|conditions of use|user agreement", re.I)
COOKIE_RE = re.compile(r"cookie|consent|onetrust|cookiebot|trustarc|didomi|iubenda|usercentrics|cookieyes|osano", re.I)
CONSENT_RE = re.compile(r"accept\s+(all\s+)?cookies|reject\s+(all\s+)?cookies|cookie\s+consent|manage\s+(your\s+)?cookies|onetrust|cookiebot|trustarc|didomi|iubenda|usercentrics|cookieyes|osano", re.I)
GDPR_RE = re.compile(r"gdpr|data subject|lawful basis|retention|erasure|right to access|controller", re.I)
NON_ESSENTIAL_COOKIE_RE = re.compile(r"analytics|marketing|advertis|facebook|google-analytics|doubleclick|segment", re.I)


@dataclass(slots=True)
class PageSnapshot:
    url: str
    status_code: int
    html: str
    set_cookie: bool


def _finding(severity: Severity, title: str, description: str, evidence: dict,
             remediation: str, confidence: float = 0.9) -> FindingResult:
    return FindingResult(
        severity=severity,
        title=title,
        description=description,
        evidence=evidence,
        remediation=remediation,
        confidence=confidence,
    )


class ComplianceCheckScanner(BaseScanner):
    name, category = "compliance_check", "compliance"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        pages = await self._discover_legal_pages(target, context)
        homepage = pages[0]
        all_text = "\n".join(page.html for page in pages)
        findings: list[FindingResult] = []

        privacy_pages = [page for page in pages if self._policy_page(page, PRIVACY_RE)]
        terms_pages = [page for page in pages if self._policy_page(page, TERMS_RE)]
        cookie_pages = [page for page in pages if self._policy_page(page, COOKIE_RE)]

        if not privacy_pages:
            findings.append(_finding(
                Severity.medium,
                "Privacy Policy was not detected",
                "No reachable page or clearly labeled link for a privacy policy was found in the scanned site surface.",
                {"pages_checked": len(pages), "policy": "privacy"},
                "Publish a clear Privacy Policy explaining data collection, purposes, legal bases, retention, sharing, user rights, and contact details.",
            ))
        elif not GDPR_RE.search(all_text):
            findings.append(_finding(
                Severity.low,
                "Privacy Policy lacks clear GDPR indicators",
                "A privacy-related page was found, but common data-rights, lawful-basis, retention, or controller language was not detected.",
                {"policy_pages": [page.url for page in privacy_pages[:3]], "indicators_checked": "GDPR/data rights/retention/lawful basis"},
                "Have counsel review the Privacy Policy and document applicable rights, lawful bases, retention periods, controller identity, and request handling.",
                0.75,
            ))

        if not terms_pages:
            findings.append(_finding(
                Severity.medium,
                "Terms of Service were not detected",
                "No reachable page or clearly labeled link for Terms of Service was found in the scanned site surface.",
                {"pages_checked": len(pages), "policy": "terms"},
                "Publish Terms of Service covering acceptable use, accounts, payments, intellectual property, warranties, liability, termination, and dispute terms.",
            ))

        consent_signal = bool(CONSENT_RE.search(homepage.html))
        non_essential_signal = bool(NON_ESSENTIAL_COOKIE_RE.search(homepage.html) or len(homepage.html) > 0 and any(
            NON_ESSENTIAL_COOKIE_RE.search(script.get("src", ""))
            for script in BeautifulSoup(homepage.html, "html.parser").find_all("script")
        ))
        if homepage.set_cookie or non_essential_signal:
            if not consent_signal:
                findings.append(_finding(
                    Severity.medium,
                    "Cookie consent signal was not detected",
                    "The site appears to set cookies or load analytics/marketing signals, but no recognizable consent mechanism was found in the initial HTML.",
                    {"set_cookie_header": homepage.set_cookie, "non_essential_signal": non_essential_signal},
                    "Implement a consent mechanism that blocks non-essential cookies and trackers until valid consent, provides a reject option, and records consent choices.",
                ))
            if not cookie_pages:
                findings.append(_finding(
                    Severity.low,
                    "Cookie Policy was not detected",
                    "Cookie-related activity was indicated, but no clearly labeled Cookie Policy page was found.",
                    {"set_cookie_header": homepage.set_cookie, "non_essential_signal": non_essential_signal},
                    "Publish a Cookie Policy describing cookie categories, purposes, providers, durations, and withdrawal instructions.",
                ))

        if not re.search(r"(?:privacy|terms|cookie|legal)", homepage.html, re.I):
            findings.append(_finding(
                Severity.low,
                "Legal links are not visible on the homepage",
                "The initial HTML does not contain an obvious Privacy, Terms, Cookie, or Legal link for users to review before using the site.",
                {"url": homepage.url},
                "Add clearly labeled, keyboard-accessible links to the applicable legal policies in the site footer or primary navigation.",
                0.8,
            ))
        return findings

    async def _discover_legal_pages(self, target: str, context: ScanContext) -> list[PageSnapshot]:
        try:
            response = await context.http.get(target)
        except Exception:
            return [PageSnapshot(target, 0, "", False)]
        homepage = PageSnapshot(
            str(response.url), response.status_code, response.text[:2_000_000], bool(response.headers.get("set-cookie"))
        )
        origin = urlparse(target).netloc
        soup = BeautifulSoup(homepage.html, "html.parser")
        candidates = {urljoin(target, path) for path in LEGAL_PATHS}
        for link in soup.find_all("a", href=True):
            url = urljoin(target, link["href"])
            label = f"{link.get_text(' ', strip=True)} {url}"
            if urlparse(url).netloc == origin and re.search(r"privacy|terms|cookie|legal|gdpr", label, re.I):
                candidates.add(url.split("#", 1)[0])
        candidates = list(candidates)[:20]
        pages = await asyncio.gather(*(self._fetch_page(context, url) for url in candidates))
        return [homepage, *[page for page in pages if page.status_code < 400 and page.html]]

    async def _fetch_page(self, context: ScanContext, url: str) -> PageSnapshot:
        try:
            response = await context.http.get(url)
            content_type = response.headers.get("content-type", "")
            html = response.text[:2_000_000] if "html" in content_type or not content_type else ""
            return PageSnapshot(str(response.url), response.status_code, html, bool(response.headers.get("set-cookie")))
        except Exception:
            return PageSnapshot(url, 0, "", False)

    @staticmethod
    def _policy_page(page: PageSnapshot, pattern: re.Pattern) -> bool:
        if pattern.search(page.url):
            return True
        soup = BeautifulSoup(page.html, "html.parser")
        heading_text = " ".join(
            element.get_text(" ", strip=True)
            for element in soup.find_all(["title", "h1", "h2"], limit=6)
        )
        return bool(pattern.search(heading_text))
