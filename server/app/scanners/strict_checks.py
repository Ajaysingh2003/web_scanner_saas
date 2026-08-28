import json
import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


def _finding(severity, title, description, evidence, remediation):
    return FindingResult(severity, title, description, evidence, remediation, confidence=0.95)


async def _page(target, context):
    response = await context.http.get(target)
    return response, BeautifulSoup(response.text[:2_000_000], "html.parser")


class CspDeepAuditScanner(BaseScanner):
    name, category = "csp_deep_audit", "configuration"

    async def scan(self, target, context):
        response = await context.http.get(target)
        value = response.headers.get("content-security-policy", "")
        if not value:
            return [_finding(Severity.medium, "Content-Security-Policy is missing", "No CSP policy was returned for the page.", {"header": "content-security-policy"}, "Send a restrictive CSP with explicit script, object, frame, and base URI directives.")]
        directives = {part.strip().split(None, 1)[0].lower(): part.strip().split()[1:] for part in value.split(";") if part.strip()}
        findings = []
        scripts = directives.get("script-src", []) + directives.get("default-src", [])
        if any(token in {"'unsafe-inline'", "'unsafe-eval'"} for token in scripts):
            findings.append(_finding(Severity.high, "CSP permits unsafe script execution", "script-src or default-src allows unsafe-inline or unsafe-eval.", {"directives": scripts}, "Remove unsafe-inline and unsafe-eval; use nonces or hashes for inline scripts."))
        if any(token == "*" or token in {"https:", "http:"} for values in directives.values() for token in values):
            findings.append(_finding(Severity.medium, "CSP contains broad source permissions", "A wildcard or unrestricted scheme allows more origins than necessary.", {"policy": value[:1000]}, "Replace wildcards and broad schemes with explicit trusted origins."))
        for directive, severity in (("default-src", Severity.medium), ("script-src", Severity.medium), ("object-src", Severity.medium), ("frame-ancestors", Severity.low), ("base-uri", Severity.low)):
            if directive not in directives:
                findings.append(_finding(severity, f"CSP is missing {directive}", f"The policy does not explicitly declare {directive}; browser fallback may be unsafe.", {"missing_directive": directive}, f"Add an explicit {directive} directive to the CSP."))
        return findings


class PermissionsPolicyScanner(BaseScanner):
    name, category = "permissions_policy", "configuration"

    async def scan(self, target, context):
        response = await context.http.get(target)
        value = response.headers.get("permissions-policy", response.headers.get("feature-policy", ""))
        if not value:
            return [_finding(Severity.low, "Permissions-Policy is missing", "Powerful browser features are not explicitly restricted.", {}, "Declare a Permissions-Policy that disables unused powerful features.")]
        findings = []
        for feature in ("camera", "microphone", "geolocation", "payment"):
            match = re.search(rf"(?:^|,|;)\s*{feature}\s*=\s*\(([^)]*)\)", value, re.I)
            if match and ("*" in match.group(1) or not match.group(1).strip()):
                findings.append(_finding(Severity.high, f"{feature} is unrestricted", f"Permissions-Policy leaves {feature} available to broad or unspecified origins.", {"feature": feature, "policy": value[:500]}, f"Allow {feature} only for the exact origins that require it."))
        return findings


class CacheControlSecurityScanner(BaseScanner):
    name, category = "cache_control_security", "configuration"

    async def scan(self, target, context):
        response, soup = await _page(target, context)
        text = soup.get_text(" ", strip=True).lower()
        sensitive = any(word in text or word in target.lower() for word in ("login", "sign in", "account", "checkout", "password")) or any("session" in key.lower() or "auth" in key.lower() for key in response.headers)
        cache = response.headers.get("cache-control", "")
        if sensitive and "no-store" not in cache.lower():
            return [_finding(Severity.high, "Sensitive page is not marked no-store", "The page appears authentication-sensitive but does not send Cache-Control: no-store.", {"cache_control": cache or None, "sensitive_heuristic": True}, "Send Cache-Control: no-store, private for authenticated or sensitive responses.")]
        if not cache:
            return [_finding(Severity.low, "Cache-Control header is missing", "The response does not declare caching behavior.", {}, "Set an explicit Cache-Control policy appropriate to the response.")]
        return []


class HttpMethodScanner(BaseScanner):
    name, category = "http_method_security", "vulnerability"

    async def scan(self, target, context):
        findings = []
        options = await context.http.options(target)
        allow = options.headers.get("allow", "")
        if "TRACE" in {method.strip().upper() for method in allow.split(",")}:
            findings.append(_finding(Severity.high, "TRACE method is enabled", "The server advertises TRACE, which can enable cross-site tracing risks.", {"allow": allow}, "Disable TRACE at the web server or reverse proxy."))
        for method in ("TRACE", "PUT", "DELETE", "PATCH"):
            response = await context.http.request(method, target)
            if response.status_code not in {404, 405, 501}:
                severity = Severity.high if method == "TRACE" else Severity.medium
                findings.append(_finding(severity, f"{method} method responded unexpectedly", f"A safe empty {method} probe returned HTTP {response.status_code}.", {"method": method, "status_code": response.status_code}, f"Restrict {method} to authenticated API routes and reject it on public pages."))
        return findings


class SecurityTxtScanner(BaseScanner):
    name, category = "security_txt", "infrastructure"

    async def scan(self, target, context):
        root = f"{urlparse(target).scheme}://{urlparse(target).netloc}"
        response = await context.http.get(urljoin(root, "/.well-known/security.txt"))
        if response.status_code == 404:
            response = await context.http.get(urljoin(root, "/security.txt"))
        if response.status_code >= 400:
            return [_finding(Severity.low, "security.txt is missing", "No security disclosure policy was found at the standard locations.", {"status_code": response.status_code}, "Publish /.well-known/security.txt with Contact and Expires fields.")]
        fields = {line.split(":", 1)[0].lower() for line in response.text.splitlines() if ":" in line}
        missing = [field for field in ("contact", "expires") if field not in fields]
        return [_finding(Severity.low, "security.txt is incomplete", "The disclosure policy is missing required fields.", {"missing_fields": missing}, "Add valid Contact and Expires fields to security.txt.")] if missing else []


class SitemapIntegrityScanner(BaseScanner):
    name, category = "sitemap_integrity", "seo"

    async def scan(self, target, context):
        root = f"{urlparse(target).scheme}://{urlparse(target).netloc}"
        response = await context.http.get(urljoin(root, "/sitemap.xml"))
        if response.status_code == 404:
            return [_finding(Severity.low, "Sitemap is missing", "No sitemap.xml was found at the site root.", {}, "Publish a valid sitemap.xml and reference it from robots.txt.")]
        urls = re.findall(r"<loc>\s*(.*?)\s*</loc>", response.text, re.I)
        duplicates = sorted({url for url in urls if urls.count(url) > 1})
        broken = []
        for url in list(dict.fromkeys(urls))[:100]:
            try:
                check = await context.http.get(url)
                if check.status_code >= 400: broken.append({"url": url, "status_code": check.status_code})
            except Exception: broken.append({"url": url, "status_code": "timeout"})
        findings = []
        if duplicates: findings.append(_finding(Severity.low, "Sitemap contains duplicate URLs", "The sitemap repeats URL entries.", {"duplicates": duplicates[:20]}, "Deduplicate sitemap URL entries."))
        if broken: findings.append(_finding(Severity.medium, "Sitemap contains broken URLs", "One or more sitemap URLs returned an error.", {"broken_urls": broken[:20]}, "Remove invalid URLs and keep the sitemap limited to canonical indexable pages."))
        return findings


class CanonicalUrlScanner(BaseScanner):
    name, category = "canonical_url", "seo"
    async def scan(self, target, context):
        _, soup = await _page(target, context)
        values = [tag.get("href", "") for tag in soup.find_all("link", rel=lambda value: value and "canonical" in value)]
        if not values: return [_finding(Severity.low, "Canonical URL is missing", "The page does not declare a canonical URL.", {"url": target}, "Add one self-referencing canonical link for the preferred URL.")]
        parsed = urlparse(values[0])
        if parsed.netloc and parsed.netloc != urlparse(target).netloc: return [_finding(Severity.medium, "Canonical URL points to another domain", "The canonical link unexpectedly points off-site.", {"canonical": values[0]}, "Use a same-domain canonical unless cross-domain consolidation is intentional.")]
        return []


class HreflangScanner(BaseScanner):
    name, category = "hreflang", "seo"
    async def scan(self, target, context):
        _, soup = await _page(target, context)
        tags = soup.find_all("link", rel="alternate", hreflang=True)
        if tags and not any(tag.get("hreflang") == "x-default" for tag in tags): return [_finding(Severity.low, "Hreflang x-default is missing", "International alternate links do not include a default fallback.", {}, "Add an x-default hreflang alternate for users without a matching locale.")]
        return []


class StructuredDataScanner(BaseScanner):
    name, category = "structured_data", "seo"
    async def scan(self, target, context):
        _, soup = await _page(target, context)
        findings = []
        for script in soup.find_all("script", type="application/ld+json"):
            try: json.loads(script.string or script.get_text())
            except json.JSONDecodeError: findings.append(_finding(Severity.medium, "Invalid JSON-LD structured data", "A JSON-LD block cannot be parsed as JSON.", {}, "Fix or remove the invalid JSON-LD block."))
        return findings


class OpenGraphScanner(BaseScanner):
    name, category = "open_graph", "seo"
    async def scan(self, target, context):
        _, soup = await _page(target, context)
        values = {tag.get("property"): tag.get("content", "") for tag in soup.find_all("meta", property=True)}
        missing = [key for key in ("og:title", "og:description", "og:image", "og:url", "og:type") if not values.get(key)]
        return [_finding(Severity.medium, "Open Graph metadata is incomplete", "Social previews are missing required Open Graph fields.", {"missing": missing}, "Add complete og:title, og:description, og:image, og:url, and og:type metadata.")] if missing else []


class ImageSeoScanner(BaseScanner):
    name, category = "image_seo", "seo"
    async def scan(self, target, context):
        _, soup = await _page(target, context)
        missing = [urljoin(target, image.get("src", "")) for image in soup.find_all("img") if image.get("src") and image.get("alt") is None]
        return [_finding(Severity.medium, "Images are missing alternative text", "Content images without alt text are inaccessible and provide weaker image context to search engines.", {"affected_images": missing[:30]}, "Add concise alt text to meaningful images and use alt=\"\" only for decorative images.")] if missing else []


class MobileReadinessScanner(BaseScanner):
    name, category = "mobile_readiness", "performance"
    async def scan(self, target, context):
        _, soup = await _page(target, context)
        viewport = soup.find("meta", attrs={"name": re.compile("^viewport$", re.I)})
        if not viewport or "width=device-width" not in viewport.get("content", "").replace(" ", "").lower(): return [_finding(Severity.medium, "Mobile viewport is missing or incomplete", "The page does not declare width=device-width for responsive rendering.", {}, "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.")]
        return []


class LinkIntegrityScanner(BaseScanner):
    name, category = "link_integrity", "seo"
    async def scan(self, target, context):
        response, soup = await _page(target, context)
        root = urlparse(target).netloc
        broken = []
        insecure = []
        for link in list(dict.fromkeys(urljoin(target, tag.get("href")) for tag in soup.find_all("a", href=True)))[:100]:
            parsed = urlparse(link)
            if parsed.scheme == "http": insecure.append(link)
            if parsed.netloc == root:
                try:
                    check = await context.http.get(link, follow_redirects=False)
                    if check.status_code >= 400: broken.append({"url": link, "status_code": check.status_code})
                except Exception: broken.append({"url": link, "status_code": "timeout"})
        findings = []
        if broken: findings.append(_finding(Severity.medium, "Broken internal links found", "Internal links returned 4xx, 5xx, or timed out.", {"broken_links": broken[:20]}, "Fix or remove links that do not resolve successfully."))
        if insecure: findings.append(_finding(Severity.medium, "Insecure HTTP links found", "The page links to resources or pages over HTTP.", {"links": insecure[:20]}, "Use HTTPS URLs for every link."))
        return findings


class PrivacySignalScanner(BaseScanner):
    name, category = "privacy_signals", "compliance"
    trackers = re.compile(r"google-analytics|googletagmanager|connect\.facebook\.net|doubleclick|hotjar|segment\.com", re.I)
    async def scan(self, target, context):
        _, soup = await _page(target, context)
        scripts = " ".join(tag.get("src", "") for tag in soup.find_all("script", src=True))
        consent = re.search(r"cookie|consent|privacy preference|do not sell", soup.get_text(" ", strip=True), re.I)
        policy = soup.find("a", href=re.compile(r"privacy|data-policy", re.I))
        findings = []
        if self.trackers.search(scripts) and not consent: findings.append(_finding(Severity.high, "Tracking scripts appear before consent", "Known analytics or advertising scripts were found without a visible consent signal.", {"tracker_detected": True}, "Load non-essential trackers only after valid consent and provide a clear opt-out."))
        if not consent: findings.append(_finding(Severity.medium, "Cookie consent signal is missing", "No visible cookie or privacy consent mechanism was detected.", {}, "Add a clear consent mechanism before loading non-essential tracking technologies."))
        if not policy: findings.append(_finding(Severity.low, "Privacy policy link is missing", "No privacy policy link was found in the page markup.", {}, "Link to a current privacy policy from the footer or primary navigation."))
        return findings
