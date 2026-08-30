import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.models import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


SECRET_PATTERNS = (
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b")),
    ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_-]{ thirty,}\b".replace("thirty", "30"))),
    ("private key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("JWT", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
    ("generic secret assignment", re.compile(
        r"(?i)\b(?:api[_-]?key|secret|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*[\"'][^\"']{16,}[\"']"
    )),
)


class ExposedArtifactsScanner(BaseScanner):
    name, category = "exposed_artifacts", "vulnerability"
    paths = (
        "/.env", "/.env.local", "/.env.production", "/.git/HEAD", "/.git/config",
        "/config.json", "/config.js", "/settings.json", "/backup.zip", "/backup.sql",
        "/database.sql", "/dump.sql", "/app.log", "/debug.log",
    )

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        findings: list[FindingResult] = []
        base = f"{urlparse(target).scheme}://{urlparse(target).netloc}"
        response = await context.http.get(target)
        html = response.text[:1_000_000] if response.status_code < 500 else ""
        source_urls = self._source_urls(target, html)
        candidates = [(urljoin(base, path), path) for path in self.paths]
        candidates.extend((url, urlparse(url).path) for url in source_urls[:20])

        seen: set[str] = set()
        for url, path in candidates:
            if url in seen or urlparse(url).netloc != urlparse(target).netloc:
                continue
            seen.add(url)
            try:
                artifact = await context.http.get(url, follow_redirects=False)
            except Exception:
                continue
            if artifact.status_code not in {200, 206} or not artifact.text:
                continue
            body = artifact.text[:1_000_000]
            matches = [name for name, pattern in SECRET_PATTERNS if pattern.search(body)]
            is_sensitive_path = path in {"/.env", "/.env.local", "/.env.production", "/.git/config"}
            if matches:
                findings.append(FindingResult(
                    Severity.critical if "private key" in matches else Severity.high,
                    "Sensitive secret exposed in a public artifact",
                    "A publicly reachable file or JavaScript source contains a credential-like value that may be usable by an attacker.",
                    {"url_path": path, "matched_secret_types": matches, "status_code": artifact.status_code},
                    "Remove the artifact from the public deployment, rotate every exposed credential, and add secret scanning to the build and deployment process.",
                    confidence=0.94,
                ))
            elif is_sensitive_path:
                findings.append(FindingResult(
                    Severity.high if path.startswith("/.env") else Severity.medium,
                    "Sensitive deployment artifact is publicly reachable",
                    "A configuration, repository, or database artifact is accessible without authentication.",
                    {"url_path": path, "status_code": artifact.status_code, "content_length": len(artifact.content)},
                    "Remove the file from the public web root, revoke any credentials it may contain, and deny access at the web server or CDN.",
                    confidence=0.9,
                ))
        return findings

    @staticmethod
    def _source_urls(target: str, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        urls = []
        for script in soup.find_all("script", src=True):
            source = urljoin(target, script.get("src"))
            urls.append(source)
            urls.append(f"{source}.map")
        for match in re.finditer(r"sourceMappingURL=([^\s*]+)", html):
            urls.append(urljoin(target, match.group(1).strip()))
        return list(dict.fromkeys(urls))
