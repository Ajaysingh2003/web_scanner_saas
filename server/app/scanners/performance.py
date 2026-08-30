import time
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


class PerformanceBasicsScanner(BaseScanner):
    name, category = "performance_basics", "performance"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        started = time.perf_counter()
        response = await context.http.get(target)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
        html = response.text[:2_000_000]
        soup = BeautifulSoup(html, "html.parser")
        findings: list[FindingResult] = []
        size = len(response.content)
        resource_count = sum(len(soup.find_all(tag, **attrs)) for tag, attrs in (
            ("script", {}), ("img", {}), ("link", {"rel": "stylesheet"}), ("iframe", {})))
        if elapsed_ms > 1500:
            findings.append(FindingResult(Severity.high, "Slow initial response", "The main document took longer than 1.5 seconds to respond in this scan.",
                                          {"response_time_ms": elapsed_ms}, "Reduce server work, optimize database calls, and use caching or a CDN."))
        elif elapsed_ms > 800:
            findings.append(FindingResult(Severity.medium, "Initial response could be faster", "The main document response exceeded a useful performance budget.",
                                          {"response_time_ms": elapsed_ms}, "Optimize server response time and cache public pages."))
        if size > 2_000_000:
            findings.append(FindingResult(Severity.medium, "Large main document", "The HTML response is larger than two megabytes before browser rendering.",
                                          {"bytes": size}, "Remove unnecessary markup, inline payloads, and duplicated data."))
        if resource_count > 50:
            findings.append(FindingResult(Severity.medium, "Many page resources", "The main document references a high number of scripts, images, stylesheets, or frames.",
                                          {"resource_count": resource_count}, "Bundle and defer non-critical assets, remove unused resources, and lazy-load below-the-fold content."))
        encoding = response.headers.get("content-encoding", "").lower()
        if "br" not in encoding and "gzip" not in encoding:
            findings.append(FindingResult(Severity.low, "HTML compression is not advertised", "The response does not advertise Brotli or gzip compression.",
                                          {"content_encoding": encoding or None}, "Enable Brotli or gzip for HTML, JavaScript, CSS, and JSON responses."))
        images = soup.find_all("img")
        if images and any(not img.get("loading") for img in images):
            findings.append(FindingResult(Severity.info, "Images may not be lazy-loaded", "Some images do not declare a loading strategy, which can increase initial work.",
                                          {"images_without_loading": sum(not img.get("loading") for img in images)},
                                          "Lazy-load below-the-fold images while eagerly loading the primary above-the-fold image."))
        blocking_scripts = [script.get("src", "inline") for script in soup.find_all("script")
                            if not script.get("async") and not script.get("defer") and not script.get("type", "").lower() == "module"]
        if blocking_scripts:
            findings.append(FindingResult(Severity.low, "Render-blocking scripts detected", "Scripts without async, defer, or module loading can delay first render.",
                                          {"count": len(blocking_scripts), "examples": blocking_scripts[:5]},
                                          "Defer non-critical scripts and keep only essential work on the critical rendering path."))
        return findings
