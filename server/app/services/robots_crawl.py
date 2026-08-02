import asyncio
import re
from collections.abc import Iterable
from urllib.parse import urldefrag, urljoin, urlparse, urlunparse
from urllib import robotparser
from xml.etree import ElementTree

import httpx
from bs4 import BeautifulSoup

from app.core.config import get_settings
from app.models.scan import Severity
from app.scanners.base import FindingResult


MAX_PAGES = 50
MAX_SITEMAP_BYTES = 1_000_000
MAX_PAGE_BYTES = 2_000_000
MAX_DEPTH = 2
CRAWL_CONCURRENCY = 8
PAGE_TIMEOUT_SECONDS = 10.0
SKIP_EXTENSIONS = re.compile(
    r"\.(?:7z|avi|bin|css|csv|docx?|gif|gz|ico|jpe?g|js|m4a|mp[34]|pdf|png|rar|svg|tar|tiff?|txt|webp|woff2?|xlsx?|xml|zip)$",
    re.I,
)


def _origin(url: str) -> str:
    parsed = urlparse(url)
    return urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))


def _normalize_url(url: str, origin: str) -> str | None:
    absolute = urljoin(origin + "/", url)
    parsed = urlparse(urldefrag(absolute)[0])
    if parsed.scheme not in {"http", "https"} or parsed.netloc.lower() != urlparse(origin).netloc.lower():
        return None
    if parsed.username or parsed.password or SKIP_EXTENSIONS.search(parsed.path):
        return None
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path or "/", "", parsed.query, ""))


def _path(url: str) -> str:
    parsed = urlparse(url)
    return parsed.path or "/" if not parsed.query else f"{parsed.path or '/'}?{parsed.query}"


async def _get_page(client: httpx.AsyncClient, url: str) -> tuple[str, str] | None:
    try:
        response = await client.get(url, follow_redirects=True)
    except (httpx.HTTPError, ValueError):
        return None
    if response.status_code >= 400:
        return None
    content_type = response.headers.get("content-type", "").lower()
    if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
        return None
    return str(response.url), response.text[:MAX_PAGE_BYTES]


async def _discover_from_crawl(client: httpx.AsyncClient, origin: str) -> tuple[list[str], dict[str, str]]:
    discovered: dict[str, int] = {origin + "/": 0}
    pages: dict[str, str] = {}
    frontier = [origin + "/"]
    semaphore = asyncio.Semaphore(CRAWL_CONCURRENCY)

    async def fetch(url: str) -> tuple[str, str] | None:
        async with semaphore:
            return await _get_page(client, url)

    while frontier and len(discovered) <= MAX_PAGES:
        results = await asyncio.gather(*(fetch(url) for url in frontier))
        next_frontier: list[str] = []
        for requested, result in zip(frontier, results):
            if result is None:
                continue
            final_url, html = result
            normalized_final = _normalize_url(final_url, origin) or requested
            pages[normalized_final] = html
            depth = discovered[requested]
            if depth >= MAX_DEPTH:
                continue
            soup = BeautifulSoup(html, "html.parser")
            for anchor in soup.find_all("a", href=True):
                candidate = _normalize_url(anchor["href"], origin)
                if candidate is None or candidate in discovered or len(discovered) >= MAX_PAGES:
                    continue
                discovered[candidate] = depth + 1
                next_frontier.append(candidate)
        frontier = next_frontier
    return list(discovered), pages


def _sitemap_urls(content: str, origin: str) -> list[str]:
    try:
        root = ElementTree.fromstring(content)
    except ElementTree.ParseError:
        return []
    urls: list[str] = []
    for node in root.iter():
        if node.tag.rsplit("}", 1)[-1] != "loc" or not node.text:
            continue
        candidate = _normalize_url(node.text.strip(), origin)
        if candidate and candidate not in urls:
            urls.append(candidate)
        if len(urls) >= MAX_PAGES:
            break
    return urls


async def _fetch_sitemap(client: httpx.AsyncClient, origin: str) -> list[str]:
    try:
        response = await client.get(origin + "/sitemap.xml", follow_redirects=True)
    except (httpx.HTTPError, ValueError):
        return []
    if response.status_code != 200 or len(response.content) > MAX_SITEMAP_BYTES:
        return []
    return _sitemap_urls(response.text, origin)


async def _fetch_pages(client: httpx.AsyncClient, urls: Iterable[str]) -> dict[str, str]:
    urls = list(urls)
    semaphore = asyncio.Semaphore(CRAWL_CONCURRENCY)

    async def fetch(url: str) -> tuple[str, str] | None:
        async with semaphore:
            return await _get_page(client, url)

    fetched = await asyncio.gather(*(fetch(url) for url in urls))
    pages: dict[str, str] = {}
    for requested, result in zip(urls, fetched):
        if result is not None:
            final_url, html = result
            pages[final_url] = html
            pages.setdefault(requested, html)
    return pages


def _meta_robots(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    values = []
    for tag in soup.find_all("meta"):
        if (tag.get("name") or "").strip().lower() == "robots":
            values.append((tag.get("content") or "").lower())
    return ",".join(values)


async def run_robots_crawl(base_url: str) -> dict:
    origin = _origin(base_url).rstrip("/")
    robots_url = origin + "/robots.txt"
    timeout = httpx.Timeout(PAGE_TIMEOUT_SECONDS)
    limits = httpx.Limits(max_connections=CRAWL_CONCURRENCY)
    headers = {"User-Agent": get_settings().user_agent}
    async with httpx.AsyncClient(timeout=timeout, limits=limits, headers=headers) as client:
        try:
            robots_response = await client.get(robots_url, follow_redirects=True)
        except (httpx.HTTPError, ValueError):
            robots_response = None
        robots_present = robots_response is not None and robots_response.status_code == 200
        parser = robotparser.RobotFileParser()
        if robots_present:
            parser.set_url(robots_url)
            parser.parse(robots_response.text[:MAX_SITEMAP_BYTES].splitlines())

        sitemap_urls = await _fetch_sitemap(client, origin)
        if sitemap_urls:
            discovered = sitemap_urls
            page_html = await _fetch_pages(client, discovered)
        else:
            discovered, page_html = await _discover_from_crawl(client, origin)

        discovered = [url for url in discovered if url in page_html]

    findings: list[FindingResult] = []
    if not discovered:
        discovered = [origin + "/"]
    if not robots_present:
        findings.append(FindingResult(
            Severity.medium, "robots.txt is missing",
            "No robots.txt found — no crawl policy exists for any page on this site.",
            {"affected_pages": [_path(url) for url in discovered]},
            "Publish a valid robots.txt at the site root with intentional crawl rules.",
            confidence=0.95,
        ))
    else:
        for url in discovered:
            if parser.can_fetch("*", url):
                meta = _meta_robots(page_html[url]) if url in page_html else ""
                if "noindex" in meta:
                    findings.append(FindingResult(
                        Severity.info, "Page has a meta noindex directive",
                        "The page is allowed by robots.txt but asks search engines not to index it.",
                        {"page": _path(url), "robots_meta": meta},
                        "Confirm the noindex directive is intentional and consistent with the page's search visibility goals.",
                        confidence=0.95,
                    ))
                continue
            findings.append(FindingResult(
                Severity.info, f"Page blocked by robots.txt: {_path(url)}",
                "The page is disallowed for the default user-agent by robots.txt.",
                {"page": _path(url), "robots_txt_url": robots_url},
                "Confirm this page is intentionally excluded from crawling and indexing.",
                confidence=0.95,
            ))
            meta = _meta_robots(page_html[url]) if url in page_html else ""
            if meta and "noindex" not in meta and "none" not in meta:
                findings.append(FindingResult(
                    Severity.low, "Blocked page does not declare noindex",
                    "robots.txt blocks the page, but its HTML does not declare a matching noindex directive.",
                    {"page": _path(url), "robots_meta": meta or None},
                    "Use robots.txt and meta robots intentionally; add noindex only when the page can be crawled to process it.",
                    confidence=0.8,
                ))
    return {
        "robots_txt_present": robots_present,
        "robots_txt_url": robots_url,
        "pages_scanned": len(discovered),
        "findings": findings,
    }
