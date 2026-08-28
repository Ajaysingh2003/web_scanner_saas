import re
from urllib.parse import urlparse

import dns.asyncresolver

from app.models import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


HOSTING_SUFFIXES = {
    "github.io": "GitHub Pages", "herokuapp.com": "Heroku", "vercel.app": "Vercel",
    "netlify.app": "Netlify", "azurewebsites.net": "Azure", "cloudfront.net": "CloudFront",
}


class DomainWatchtowerScanner(BaseScanner):
    name, category = "domain_watchtower", "infrastructure"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        hostname = (urlparse(target).hostname or "").rstrip(".").lower()
        if not hostname or re.match(r"^\d+(?:\.\d+){3}$", hostname):
            return []
        findings: list[FindingResult] = []
        resolver = dns.asyncresolver.Resolver()
        try:
            answers = await resolver.resolve(hostname, "CNAME", lifetime=4)
            cname = str(answers[0].target).rstrip(".").lower()
        except Exception:
            cname = ""
        provider = next((name for suffix, name in HOSTING_SUFFIXES.items() if cname.endswith(suffix)), None)
        if provider:
            response = await context.http.get(target, follow_redirects=False)
            body = response.text[:10_000].lower()
            takeover_signal = response.status_code in {404, 410} and any(
                marker in body for marker in ("not found", "no such app", "there isn't a github pages site here", "project not found")
            )
            if takeover_signal:
                findings.append(FindingResult(
                    Severity.high,
                    "Possible dangling hosted-service DNS record",
                    f"The hostname points to {provider}, but the service response resembles an unclaimed or missing deployment.",
                    {"hostname_redacted": True, "provider": provider, "http_status": response.status_code},
                    "Verify that the hosted resource is claimed and active. Remove the DNS record immediately if the deployment was deleted, or recreate the service before restoring the record.",
                    confidence=0.8,
                ))
        try:
            await resolver.resolve(hostname, "A", lifetime=4)
        except Exception:
            if not cname:
                findings.append(FindingResult(
                    Severity.info,
                    "Domain currently has no IPv4 address record",
                    "The target hostname did not resolve to an IPv4 address during this scan. This may be intentional for IPv6-only or proxy-based deployments.",
                    {"hostname_redacted": True},
                    "Confirm that the DNS configuration matches the intended deployment and monitor for unexpected record changes.",
                    confidence=0.7,
                ))
        return findings
