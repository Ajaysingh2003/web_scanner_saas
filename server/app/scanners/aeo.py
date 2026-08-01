import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


def _finding(severity, title, description, evidence, remediation, confidence=0.95):
    return FindingResult(severity, title, description, evidence, remediation, confidence=confidence)


class AeoScanner(BaseScanner):
    name, category = "aeo_scanner", "aeo"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await context.http.get(target)
        html = response.text[:2_000_000]
        soup = BeautifulSoup(html, "html.parser")
        findings: list[FindingResult] = []
        robots_url = urljoin(target, "/robots.txt")
        robots_response = await context.http.get(robots_url)
        robots = robots_response.text[:200_000] if robots_response.status_code < 400 else ""
        ai_agents = ("GPTBot", "ClaudeBot", "Google-Extended", "Bytespider", "CCBot")
        blocked_agents = []
        for agent in ai_agents:
            block = re.search(rf"(?is)user-agent\s*:\s*{re.escape(agent)}\s*(.*?)(?=\n\s*user-agent\s*:|\Z)", robots)
            if block and re.search(r"(?im)^\s*disallow\s*:\s*/\s*$", block.group(1)):
                blocked_agents.append(agent)
        if blocked_agents:
            findings.append(_finding(Severity.medium, "Robots policy blocks AI crawlers", "The robots.txt policy prevents one or more major answer engines from crawling the site.",
                                     {"agents": blocked_agents, "url": robots_url},
                                     "Review whether blocking these crawlers is intentional; allow selected agents if AI visibility is desired."))
        llms = await context.http.get(urljoin(target, "/llms.txt"))
        if llms.status_code >= 400 or not llms.text.strip():
            findings.append(_finding(Severity.info, "llms.txt is not present", "The emerging llms.txt convention is not available to provide machine-readable site guidance.",
                                     {"url": urljoin(target, "/llms.txt"), "status_code": llms.status_code},
                                     "Consider publishing a concise llms.txt with canonical resources and content guidance."))

        structured_types: set[str] = set()
        for script in soup.find_all("script", type=re.compile(r"application/ld\+json", re.I)):
            for value in re.findall(r'"@type"\s*:\s*"([^"]+)"', script.string or script.get_text()):
                structured_types.add(value)
        useful_types = {"Article", "FAQPage", "HowTo", "Organization", "WebSite", "BreadcrumbList"}
        if not structured_types.intersection(useful_types):
            findings.append(_finding(Severity.medium, "Useful structured data is missing", "No Article, FAQPage, HowTo, Organization, WebSite, or BreadcrumbList JSON-LD was found.",
                                     {"detected_types": sorted(structured_types)},
                                     "Add valid JSON-LD that accurately describes the page and organization."))
        else:
            findings.append(_finding(Severity.info, "Structured data is available", "The page exposes structured data that can help answer engines interpret and cite it.",
                                     {"detected_types": sorted(structured_types.intersection(useful_types))},
                                     "Keep structured data complete, current, and consistent with visible content."))

        for tag_name, field, label in (("title", None, "title"), ("meta", {"name": re.compile(r"^description$", re.I)}, "meta description")):
            tag = soup.find(tag_name, attrs=field) if field else soup.find(tag_name)
            value = (tag.get("content") if field and tag else tag.get_text(" ", strip=True) if tag else "") or ""
            if len(value.strip()) < 30:
                findings.append(_finding(Severity.low, f"{label.capitalize()} is weak for AI summaries", "The page provides little concise context for an answer engine to summarize.",
                                         {"length": len(value.strip())}, f"Write a specific, factual {label} that states the page's subject and value."))

        text = soup.get_text(" ", strip=True)
        scripts = len(soup.find_all("script"))
        if len(text) < 300 or (len(text) < 800 and scripts > 8):
            findings.append(_finding(Severity.medium, "Page content looks difficult to extract", "The response contains little meaningful text relative to its scripts, suggesting a client-side shell or thin content.",
                                     {"text_characters": len(text), "script_count": scripts},
                                     "Render important content in the initial HTML or ensure it is reliably available without client-side interaction."))
        faq_signals = len(soup.find_all(string=re.compile(r"\b(?:frequently asked|question|answer)\b", re.I)))
        if faq_signals == 0 and not soup.find(attrs={"itemscope": True, "itemtype": re.compile(r"FAQPage", re.I)}):
            findings.append(_finding(Severity.info, "No FAQ or Q&A signals found", "The page does not expose an obvious question-and-answer structure for conversational queries.",
                                     {"faq_signals": faq_signals}, "Add a genuine FAQ or clear question-and-answer sections where they help users."))

        canonical = soup.find("link", rel=lambda value: value and "canonical" in value)
        if not canonical or not canonical.get("href"):
            findings.append(_finding(Severity.medium, "Canonical guidance is missing for AI crawlers", "Answer engines may have difficulty selecting the preferred URL for this content.",
                                     {"url": target}, "Add a canonical URL and keep it stable, indexable, and consistent with internal links."))
        parsed = urlparse(target)
        if parsed.query or "//" in parsed.path or re.search(r"/[a-f0-9]{24,}", parsed.path, re.I):
            findings.append(_finding(Severity.low, "URL structure is difficult to interpret", "Query-heavy or opaque URLs provide weak topical signals and can complicate citation canonicalization.",
                                     {"url": target}, "Prefer stable, descriptive, human-readable URLs and canonicalize tracking variants."))
        if len(text) < 100:
            findings.append(_finding(Severity.high, "Page returns no meaningful text content", "The initial response is nearly empty, so answer engines may be unable to understand or cite the page.",
                                     {"text_characters": len(text)}, "Return meaningful server-rendered content in the initial HTML response."))
        return findings
