import re
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


class SecurityHeadersScanner(BaseScanner):
    name, category = "security_headers", "configuration"
    required = {"content-security-policy": Severity.high,
                "x-content-type-options": Severity.medium, "x-frame-options": Severity.medium,
                "referrer-policy": Severity.low, "permissions-policy": Severity.low}

    async def scan(self, target, context):
        response = await context.http.get(target)
        findings = []
        headers = {k.lower(): v for k, v in response.headers.items()}
        for header, severity in self.required.items():
            if header not in headers:
                findings.append(FindingResult(severity, f"Missing {header}",
                    f"The response does not include the {header} security header.",
                    {"url": target, "header": header}, f"Set {header} on every HTML response."))
        csp = headers.get("content-security-policy", "")
        if csp and re.search(r"(?:^|;)\s*(?:script-src|default-src)[^;]*\bunsafe-(?:inline|eval)\b", csp, re.I):
            findings.append(FindingResult(
                Severity.high, "Content-Security-Policy allows unsafe script execution",
                "The CSP permits unsafe-inline or unsafe-eval in a script policy, weakening XSS protection.",
                {"content_security_policy": csp[:500]},
                "Remove unsafe-inline and unsafe-eval; use nonces or hashes for required inline scripts."))
        for header, severity, remediation in (
            ("cross-origin-opener-policy", Severity.low, "Set Cross-Origin-Opener-Policy to same-origin where cross-origin isolation is appropriate."),
            ("cross-origin-resource-policy", Severity.low, "Set Cross-Origin-Resource-Policy to same-origin or a documented trusted policy."),
        ):
            if header not in headers:
                findings.append(FindingResult(severity, f"Missing {header}",
                    f"The response does not declare a {header} policy.", {"header": header}, remediation))
        if urlparse(target).scheme != "https":
            return findings
        hsts = headers.get("strict-transport-security", "")
        directives = [part.strip() for part in hsts.split(";") if part.strip()]
        directive_names = [part.split("=", 1)[0].strip().lower() for part in directives]
        duplicate_directives = sorted({name for name in directive_names if directive_names.count(name) > 1})
        max_age_values = [part.split("=", 1)[1].strip() for part in directives
                          if part.lower().startswith("max-age=") and "=" in part]
        if not hsts:
            findings.append(FindingResult(
                Severity.high, "Missing strict-transport-security",
                "The HTTPS response does not include an HSTS policy.",
                {"url": target, "header": "strict-transport-security"},
                "Set Strict-Transport-Security with max-age=31536000 after validating HTTPS for all subdomains.",
            ))
        elif duplicate_directives or len(max_age_values) != 1 or not max_age_values[0].isdigit():
            findings.append(FindingResult(
                Severity.high, "Invalid strict-transport-security policy",
                "The HSTS header has duplicate directives or an invalid max-age value.",
                {"value": hsts, "duplicate_directives": duplicate_directives},
                "Send one valid max-age directive with an integer value and no duplicate directives."))
        else:
            max_age = int(max_age_values[0])
            if max_age < 31_536_000 or "includesubdomains" not in directive_names:
                findings.append(FindingResult(
                    Severity.high, "Weak strict-transport-security policy",
                    "The HTTPS response does not enforce a one-year HSTS policy across subdomains.",
                    {"url": target, "value": hsts, "max_age": max_age,
                     "include_subdomains": "includesubdomains" in directive_names},
                    "Use max-age=31536000; includeSubDomains after validating every subdomain."))
            if "preload" not in directive_names:
                findings.append(FindingResult(
                    Severity.info, "HSTS preload directive is absent",
                    "The site is not declaring intent to participate in browser HSTS preload lists.",
                    {"url": target},
                    "Add preload only after meeting browser preload requirements and validating all subdomains.",
                    confidence=0.7))
        try:
            http_target = urlparse(target)._replace(scheme="http").geturl()
            redirect = await context.http.get(http_target, follow_redirects=False)
            location = redirect.headers.get("location", "")
            if redirect.status_code not in {301, 302, 307, 308} or not location.lower().startswith("https://"):
                findings.append(FindingResult(
                    Severity.high, "HTTP does not redirect to HTTPS",
                    "The HTTP origin does not enforce a direct redirect to the HTTPS origin.",
                    {"url": http_target, "status_code": redirect.status_code, "location": location or None},
                    "Redirect every HTTP request to its HTTPS equivalent before relying on HSTS."))
        except Exception:
            pass
        return findings


class ApiKeyExposureScanner(BaseScanner):
    name, category = "api_key_exposure", "vulnerability"
    secret_patterns = (
        ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b"), Severity.critical),
        ("Stripe secret key", re.compile(r"\bsk_(?:live|test)_[0-9A-Za-z]{16,}\b"), Severity.critical),
        ("OpenAI API key", re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"), Severity.critical),
        ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"), Severity.high),
        ("GitHub token", re.compile(r"\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{20,}\b"), Severity.critical),
        ("Slack token", re.compile(r"\bxox[baprs]-[0-9A-Za-z-]{20,}\b"), Severity.critical),
        ("Twilio secret", re.compile(r"\bSK[0-9a-fA-F]{32}\b"), Severity.high),
        ("SendGrid key", re.compile(r"\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b"), Severity.critical),
        ("Mailgun key", re.compile(r"\bkey-[0-9a-f]{32}\b", re.I), Severity.critical),
        ("Supabase service key", re.compile(r"(?:service_role|SUPABASE_SERVICE_ROLE_KEY)[^\n]{0,80}eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", re.I), Severity.critical),
        ("Firebase private key", re.compile(r"(?:private_key|BEGIN PRIVATE KEY)[^\n]{0,120}BEGIN PRIVATE KEY", re.I), Severity.critical),
    )
    generic_pattern = re.compile(
        r"(?i)\b(?:api[_-]?key|secret|access[_-]?token|password|private[_-]?key)\b\s*[:=]\s*['\"]([A-Za-z0-9+/=_-]{32,})['\"]"
    )

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await context.http.get(target)
        documents = [(target, response.text[:2_000_000])]
        if "html" in response.headers.get("content-type", "").lower():
            soup = BeautifulSoup(response.text[:2_000_000], "html.parser")
            scripts = [urljoin(target, script["src"]) for script in soup.find_all("script", src=True)]
            for script_url in list(dict.fromkeys(scripts))[:20]:
                try:
                    script_response = await context.http.get(script_url)
                    if script_response.status_code < 400:
                        documents.append((script_url, script_response.text[:2_000_000]))
                except Exception:
                    continue
        findings: list[FindingResult] = []
        seen: set[tuple[str, str]] = set()
        for source, document in documents:
            for label, pattern, severity in self.secret_patterns:
                if not pattern.search(document):
                    continue
                key = (label, source)
                if key in seen:
                    continue
                seen.add(key)
                findings.append(FindingResult(
                    severity, f"Possible {label} exposed publicly",
                    f"A high-signal {label} pattern was found in a public response.",
                    {"source": source, "secret_type": label},
                    "Remove the secret from client-visible assets, rotate it immediately, and proxy privileged calls through the server.",
                    confidence=0.95,
                ))
            generic_match = self.generic_pattern.search(document)
            if generic_match and ("<!--" in document or "<meta" in document.lower() or "<script" in document.lower()):
                findings.append(FindingResult(
                    Severity.high, "High-entropy secret near sensitive keyword",
                    "A long secret-like value appears next to an API key, token, password, or secret keyword in a public asset.",
                    {"source": source, "pattern": "sensitive keyword assigned a high-entropy value"},
                    "Remove the value from public HTML or JavaScript, rotate it, and keep secrets on the server.",
                    confidence=0.8,
                ))
        return findings


class CorsScanner(BaseScanner):
    name, category = "cors", "vulnerability"

    async def scan(self, target, context):
        responses = [await context.http.options(target, headers={"Origin": "https://aetherscan.invalid"}),
                     await context.http.get(target, headers={"Origin": "https://aetherscan.invalid"})]
        response = next((item for item in responses if item.headers.get("access-control-allow-origin")), responses[0])
        allow_origin = response.headers.get("access-control-allow-origin", "")
        allow_credentials = response.headers.get("access-control-allow-credentials", "").lower()
        if allow_origin == "*" and allow_credentials == "true":
            severity = Severity.high
            title = "Wildcard CORS allows credentials"
            fix = "Replace wildcard origins with an explicit allowlist and disable credentials unless required."
        elif allow_origin == "*":
            severity = Severity.medium
            title = "Wildcard CORS policy"
            fix = "Restrict Access-Control-Allow-Origin to the trusted application origins."
        elif allow_origin == "https://aetherscan.invalid":
            return [FindingResult(Severity.high, "CORS reflects arbitrary origins",
                "The target reflects an untrusted Origin in its CORS response.",
                {"allow_origin": allow_origin, "allow_credentials": allow_credentials},
                "Validate the Origin against a strict allowlist and never reflect arbitrary origins.")]
        else:
            return []
        return [FindingResult(severity, title, "The target advertises a permissive cross-origin policy.",
                              {"allow_origin": allow_origin, "allow_credentials": allow_credentials}, fix)]


class SriScanner(BaseScanner):
    name, category = "subresource_integrity", "configuration"
    valid_algorithms = {"sha256", "sha384", "sha512"}

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await context.http.get(target)
        if "html" not in response.headers.get("content-type", "").lower():
            return []
        soup = BeautifulSoup(response.text[:2_000_000], "html.parser")
        origin = urlparse(target).netloc.lower()
        findings: list[FindingResult] = []
        for script in soup.find_all("script", src=True):
            source = urljoin(target, script.get("src", "").strip())
            parsed = urlparse(source)
            if parsed.scheme not in {"http", "https"} or parsed.netloc.lower() == origin:
                continue
            integrity = script.get("integrity", "").strip()
            if not integrity:
                findings.append(FindingResult(
                    Severity.high, "Third-party script is missing SRI",
                    "A script loaded from another origin has no cryptographic integrity metadata.",
                    {"script": source},
                    "Pin the script with a sha384 or sha512 integrity hash, or self-host the dependency."))
                continue
            tokens = integrity.split()
            valid_tokens = [token for token in tokens
                            if "-" in token and token.split("-", 1)[0].lower() in self.valid_algorithms
                            and re.fullmatch(r"[A-Za-z0-9+/]+={0,2}", token.split("-", 1)[1])]
            if not valid_tokens or len(valid_tokens) != len(tokens):
                findings.append(FindingResult(
                    Severity.high, "Third-party script has invalid SRI",
                    "The script integrity attribute does not contain valid sha256, sha384, or sha512 hashes.",
                    {"script": source, "integrity": integrity},
                    "Use a valid base64 sha256, sha384, or sha512 integrity token generated from the exact asset."))
            if not any(token.lower().startswith(("sha384-", "sha512-")) for token in valid_tokens):
                findings.append(FindingResult(
                    Severity.medium, "Third-party script uses weak SRI coverage",
                    "The script is protected only by sha256; stronger sha384 or sha512 coverage is preferred.",
                    {"script": source},
                    "Use a sha384 or sha512 integrity hash for third-party scripts.", confidence=0.9))
            if not script.get("crossorigin"):
                findings.append(FindingResult(
                    Severity.medium, "Cross-origin SRI script lacks crossorigin",
                    "Cross-origin SRI fetches should declare an explicit CORS mode for reliable integrity validation.",
                    {"script": source},
                    "Add crossorigin=\"anonymous\" and configure the asset origin for anonymous CORS.", confidence=0.85))
        return findings


class MixedContentScanner(BaseScanner):
    name, category = "mixed_content", "configuration"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        if urlparse(target).scheme != "https":
            return []
        response = await context.http.get(target)
        if "html" not in response.headers.get("content-type", "").lower():
            return []
        soup = BeautifulSoup(response.text[:2_000_000], "html.parser")
        insecure: set[str] = set()
        for tag in soup.find_all(True):
            for attribute in ("src", "href", "action", "poster", "data", "srcset"):
                value = tag.get(attribute, "")
                values = value.split(",") if attribute == "srcset" else [value]
                insecure.update(item.strip().split(" ", 1)[0] for item in values
                                if item.strip().lower().startswith(("http://", "//")))
            insecure.update(re.findall(
                r"(?:url\(\s*['\"]?|@import\s+['\"])((?:https?:)?//[^'\")\s]+)",
                tag.get("style", ""), re.I))
        for style in soup.find_all("style"):
            insecure.update(re.findall(
                r"(?:url\(\s*['\"]?|@import\s+['\"])((?:https?:)?//[^'\")\s]+)",
                style.get_text(), re.I))
        if not insecure:
            return []
        return [FindingResult(
            Severity.high, "Mixed content references found",
            "The HTTPS page references resources or form actions over HTTP or protocol-relative URLs.",
            {"count": len(insecure), "examples": sorted(insecure)[:10]},
            "Serve every resource over HTTPS and update protocol-relative or hard-coded HTTP URLs.")]


class CookieSecurityScanner(BaseScanner):
    name, category = "cookie_security", "configuration"
    session_markers = ("session", "auth", "token", "jwt", "sid", "login")

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await context.http.get(target)
        findings: list[FindingResult] = []
        is_https = urlparse(target).scheme == "https"
        for cookie in response.headers.get_list("set-cookie"):
            parts = [part.strip() for part in cookie.split(";")]
            name = parts[0].split("=", 1)[0].strip()
            lower = cookie.lower()
            is_session = any(marker in name.lower() for marker in self.session_markers)
            if is_https and "secure" not in lower:
                findings.append(FindingResult(
                    Severity.high if is_session else Severity.medium, "HTTPS cookie is missing Secure",
                    "A cookie set over HTTPS lacks the Secure attribute.", {"cookie_name": name},
                    "Set Secure on every cookie that is transmitted over HTTPS.", confidence=0.95,
                ))
            if is_session and "httponly" not in lower:
                findings.append(FindingResult(
                    Severity.high, "Session cookie is missing HttpOnly",
                    "A session-like cookie can be read by client-side JavaScript.", {"cookie_name": name},
                    "Set HttpOnly on authentication and session cookies to reduce token theft via XSS.",
                ))
            same_site = re.search(r"samesite\s*=\s*([^;]+)", lower)
            if not same_site or same_site.group(1).strip() == "none":
                findings.append(FindingResult(
                    Severity.high if same_site else Severity.medium,
                    "Cookie has weak SameSite protection",
                    "A cookie is missing SameSite or explicitly allows cross-site delivery.",
                    {"cookie_name": name, "samesite": same_site.group(1).strip() if same_site else None},
                    "Use SameSite=Lax or Strict for session cookies; use SameSite=None only with Secure for documented cross-site flows.",
                ))
            max_age = re.search(r"max-age\s*=\s*(\d+)", lower)
            expires = re.search(r"expires\s*=\s*([^;]+)", cookie, re.I)
            lifetime_days = None
            if max_age:
                lifetime_days = int(max_age.group(1)) / 86400
            elif expires:
                try:
                    lifetime_days = (parsedate_to_datetime(expires.group(1)).replace(tzinfo=timezone.utc)
                                     - datetime.now(timezone.utc)).total_seconds() / 86400
                except (TypeError, ValueError, OverflowError):
                    pass
            if lifetime_days is not None and lifetime_days > 365:
                findings.append(FindingResult(
                    Severity.medium, "Cookie lifetime is unusually long",
                    "A cookie remains valid for more than one year.",
                    {"cookie_name": name, "lifetime_days": round(lifetime_days)},
                    "Shorten session lifetimes and use rotating refresh tokens with revocation.",
                ))
        return findings


class DebugEndpointsScanner(BaseScanner):
    name, category = "debug_endpoints", "vulnerability"
    paths = ("/.env", "/.git/HEAD", "/debug", "/actuator/env", "/server-status", "/phpinfo.php")

    async def scan(self, target, context):
        base = target.rstrip("/")
        findings = []
        for path in self.paths:
            response = await context.http.get(base + path)
            body = response.text[:200_000].lower()
            signature = (
                path == "/.git/HEAD" and body.startswith("ref: refs/")
                or path == "/.env" and any(marker in body for marker in ("=", "secret", "database_url"))
                or path == "/phpinfo.php" and "php version" in body
                or path in {"/debug", "/actuator/env", "/server-status"} and len(response.content) > 0
            )
            if response.status_code < 400 and signature:
                findings.append(FindingResult(Severity.high if path == "/.env" else Severity.medium,
                    f"Accessible debug or sensitive endpoint: {path}",
                    "A commonly exposed diagnostic or secret-bearing endpoint returned content.",
                    {"url": base + path, "status_code": response.status_code},
                    "Remove the endpoint from production or protect it with strong authentication and network controls."))
        return findings


class XssSurfaceScanner(BaseScanner):
    name, category = "xss_surface", "vulnerability"
    dangerous_sinks = ("innerHTML", "outerHTML", "document.write(", "insertAdjacentHTML(")

    async def scan(self, target, context):
        response = await context.http.get(target)
        if "html" not in response.headers.get("content-type", "").lower():
            return []
        soup = BeautifulSoup(response.text[:2_000_000], "html.parser")
        documents = [("inline", "\n".join(script.get_text() for script in soup.find_all("script") if not script.get("src")))]
        for script in soup.find_all("script", src=True):
            script_url = urljoin(target, script["src"])
            try:
                script_response = await context.http.get(script_url)
                if script_response.status_code < 400:
                    documents.append((script_url, script_response.text[:2_000_000]))
            except Exception:
                continue
        sinks = sorted({sink for _, document in documents for sink in self.dangerous_sinks if sink in document})
        if not sinks:
            return []
        return [FindingResult(Severity.medium, "Potential client-side XSS sink detected",
            "Client-side JavaScript uses DOM APIs that can become XSS sinks when fed untrusted input.",
            {"url": target, "sinks": sinks, "sources_scanned": len(documents)},
            "Avoid assigning untrusted data to HTML sinks; use textContent, output encoding, and a restrictive CSP.",
            confidence=0.7)]


class OpenRedirectScanner(BaseScanner):
    name, category = "open_redirect", "vulnerability"
    parameter_names = ("next", "url", "redirect", "redirect_uri", "return_to")

    async def scan(self, target, context):
        parsed = urlparse(target)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        if not query:
            query = {name: "https://aetherscan.invalid/" for name in self.parameter_names}
        findings = []
        for name in tuple(query):
            if name.lower() not in self.parameter_names:
                continue
            test_query = dict(query)
            test_query[name] = "https://aetherscan.invalid/"
            candidate = urlunparse(parsed._replace(query=urlencode(test_query)))
            response = await context.http.get(candidate, follow_redirects=False)
            location = response.headers.get("location", "")
            if 300 <= response.status_code < 400 and urlparse(location).hostname == "aetherscan.invalid":
                findings.append(FindingResult(Severity.high, "Potential open redirect",
                    "A redirect parameter caused the server to redirect to an external host.",
                    {"parameter": name, "location": location},
                    "Allow only relative paths or validate destinations against a strict trusted-origin allowlist."))
        return findings
