import json
import re
from urllib.parse import quote
from urllib.parse import urljoin, urlparse

from app.models import Severity
from app.core.secrets import decrypt_secret
from app.scanners.base import BaseScanner, FindingResult, ScanContext


class ExtendedSecurityScanner(BaseScanner):
    category = "security"

    def __init__(self, scan_type: str):
        self.scan_type = scan_type
        self.name = scan_type

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        if self.scan_type == "firebase":
            return await self._firebase(target, context)
        if self.scan_type == "audit_logging":
            return await self._audit_logging(target, context)
        if self.scan_type == "mobile_api":
            return await self._mobile_api(target, context)
        if self.scan_type == "hosting_security":
            return await self._hosting(target, context)
        if self.scan_type == "ddos_resilience":
            return await self._ddos_resilience(target, context)
        if self.scan_type == "tenant_isolation":
            return await self._tenant_isolation(target, context)
        if self.scan_type in {"github_sast", "dependencies"}:
            return await self._github_repository(context)
        return []

    async def _github_repository(self, context: ScanContext) -> list[FindingResult]:
        integration = self._integration(context)
        if not integration:
            return self._integration_required("A repository connection is required.")
        repository_url = integration.get("repository_url") or ""
        parsed = urlparse(repository_url)
        if parsed.netloc.lower() not in {"github.com", "www.github.com"}:
            return self._integration_required("Only GitHub repository URLs are supported by this scanner.")
        parts = [part for part in parsed.path.split("/") if part]
        if len(parts) < 2:
            return self._integration_required("The repository URL must include an owner and repository name.")
        owner, repository = parts[0], parts[1].removesuffix(".git")
        headers = {"Accept": "application/vnd.github+json"}
        if integration.get("github_token"):
            headers["Authorization"] = f"Bearer {integration['github_token']}"
        api_base = f"https://api.github.com/repos/{owner}/{repository}"
        try:
            tree_response = await context.http.get(f"{api_base}/git/trees/HEAD?recursive=1", headers=headers)
        except Exception:
            return self._integration_required("The GitHub repository could not be reached by the worker.")
        if tree_response.status_code >= 400:
            return self._integration_required("The GitHub repository requires a valid authorized connection.")
        tree = tree_response.json().get("tree", [])
        files = [item["path"] for item in tree if item.get("type") == "blob" and item.get("path")]
        if self.scan_type == "dependencies":
            manifests = [path for path in files if path.rsplit("/", 1)[-1] in {
                "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
                "requirements.txt", "poetry.lock", "composer.json", "Gemfile.lock",
            }]
            if not manifests:
                return []
            return await self._dependency_advisories(
                context, owner, repository, files, manifests, headers
            )
        findings: list[FindingResult] = []
        patterns = (
            ("dangerous dynamic execution", re.compile(r"\beval\s*\(|\bexec\s*\(|child_process\.exec", re.I), Severity.high),
            ("unsafe HTML injection", re.compile(r"dangerouslySetInnerHTML|innerHTML\s*=", re.I), Severity.medium),
            ("shell command construction", re.compile(r"shell\s*=\s*True|subprocess\.(?:run|Popen).*shell", re.I), Severity.high),
            ("hardcoded credential-like assignment", re.compile(r"(?:api[_-]?key|secret|token)\s*[:=]\s*['\"][^'\"]{16,}", re.I), Severity.high),
        )
        candidate_files = [path for path in files if path.endswith((".js", ".ts", ".jsx", ".tsx", ".py", ".rb", ".php"))][:40]
        for path in candidate_files:
            try:
                source_response = await context.http.get(
                    f"https://raw.githubusercontent.com/{owner}/{repository}/HEAD/{path}", headers=headers
                )
                source = source_response.text[:500_000]
            except Exception:
                continue
            matches = [name for name, pattern, _severity in patterns if pattern.search(source)]
            for name, _pattern, severity in patterns:
                if name not in matches:
                    continue
                findings.append(self._finding(
                    severity, f"Potential {name} pattern in repository source",
                    "Static source review found a pattern that requires code-level validation; this is not proof of exploitability.",
                    {"repository": f"{owner}/{repository}", "file_path": path, "pattern": name},
                    "Review the affected code path, replace unsafe dynamic behavior with allowlisted APIs, and add a focused security regression test.",
                    0.7,
                ))
            findings.extend(self._taint_findings(path, source, patterns))
        return findings

    @staticmethod
    def _integration(context: ScanContext) -> dict:
        encrypted = (context.security_test or {}).get("integration_encrypted")
        if not encrypted:
            return {}
        return json.loads(decrypt_secret(str(encrypted)))

    async def _dependency_advisories(self, context, owner, repository, files, manifests, headers):
        packages = []
        for path in manifests[:20]:
            try:
                response = await context.http.get(
                    f"https://raw.githubusercontent.com/{owner}/{repository}/HEAD/{quote(path)}",
                    headers=headers,
                )
                content = response.text[:1_000_000]
            except Exception:
                continue
            filename = path.rsplit("/", 1)[-1]
            if filename == "package.json":
                try:
                    package_json = response.json()
                    for section in ("dependencies", "devDependencies", "optionalDependencies"):
                        packages.extend({"name": name, "version": self._normalize_version(version),
                                         "ecosystem": "npm", "path": path}
                                         for name, version in package_json.get(section, {}).items()
                                         if self._normalize_version(version))
                except Exception:
                    continue
            elif filename == "package-lock.json":
                try:
                    lockfile = response.json()
                    for package_path, package_data in lockfile.get("packages", {}).items():
                        name = package_path.rsplit("node_modules/", 1)[-1]
                        if package_data.get("version") and name and name != package_path:
                            packages.append({"name": name, "version": package_data["version"],
                                             "ecosystem": "npm", "path": path})
                except Exception:
                    continue
            elif filename == "requirements.txt":
                for line in content.splitlines():
                    match = re.match(r"^\s*([A-Za-z0-9_.-]+)\s*==\s*([^\s#]+)", line)
                    if match:
                        packages.append({"name": match.group(1), "version": match.group(2),
                                         "ecosystem": "PyPI", "path": path})
        packages = packages[:100]
        if not packages:
            return []
        try:
            advisory_response = await context.http.post(
                "https://api.osv.dev/v1/querybatch",
                json={"queries": [{"package": {"name": item["name"], "ecosystem": item["ecosystem"]},
                                    "version": item["version"]} for item in packages]},
            )
            results = advisory_response.json().get("results", [])
        except Exception:
            return [self._finding(
                Severity.info, "Dependency manifests found but advisory lookup was unavailable",
                "The repository dependency graph was discovered, but the advisory service did not return a result during this scan.",
                {"repository": f"{owner}/{repository}", "manifest_paths": manifests[:30]},
                "Retry the scan and review the resolved lockfile versions against a current security advisory database.",
                0.9,
            )]
        findings = []
        for item, result in zip(packages, results):
            vulnerabilities = result.get("vulns", [])
            if not vulnerabilities:
                continue
            findings.append(self._finding(
                Severity.high, f"Known advisory affects {item['name']}",
                "The connected repository contains a dependency version matched by a public OSV advisory.",
                {"package": item["name"], "version": item["version"], "ecosystem": item["ecosystem"],
                 "manifest_path": item["path"], "advisory_ids": [v.get("id") for v in vulnerabilities[:10]]},
                "Upgrade to a patched version, regenerate the lockfile, test the application, and verify that transitive vulnerable versions are removed.",
                0.95,
            ))
        return findings

    @staticmethod
    def _normalize_version(value: str) -> str | None:
        match = re.search(r"\d+(?:\.\d+){1,2}(?:[-+][0-9A-Za-z.-]+)?", str(value))
        return match.group(0) if match else None

    @staticmethod
    def _taint_findings(path, source, patterns):
        source_names = set(re.findall(
            r"(?:const|let|var|[A-Za-z_][A-Za-z0-9_]*\s*=)\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:req\.|request\.|params|query|body|location\.)",
            source,
            re.I,
        ))
        if not source_names:
            source_names = set(re.findall(r"(?:req\.(?:query|body|params)|request\.(?:args|form|json))[^\n;]*", source, re.I))
        if not source_names:
            return []
        sink_patterns = {
            "unsafe HTML injection": re.compile(r"innerHTML\s*=|dangerouslySetInnerHTML", re.I),
            "dynamic execution": re.compile(r"eval\s*\(|exec\s*\(", re.I),
            "SQL query construction": re.compile(r"(?:execute|query)\s*\([^\n]*(?:\+|f['\"]|format\s*\()", re.I),
        }
        findings = []
        for sink_name, sink_pattern in sink_patterns.items():
            for line_number, line in enumerate(source.splitlines(), 1):
                if sink_pattern.search(line) and (not source_names or any(name in line for name in source_names)):
                    findings.append(ExtendedSecurityScanner("")._finding(
                        Severity.high, f"Potential tainted data flow to {sink_name}",
                        "A same-file source-to-sink pattern was detected in connected repository code. Manual review is required to confirm reachability and sanitization.",
                        {"file_path": path, "line": line_number, "sink": sink_name, "analysis": "bounded_same_file_taint"},
                        "Trace the input to the sink, apply context-aware validation or encoding, and add a regression test covering the unsafe path.",
                        0.68,
                    ))
                    break
        return findings

    async def _firebase(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await context.http.get(target)
        html = response.text[:1_000_000]
        integration = self._integration(context)
        firebase_api_key = integration.get("firebase_api_key")
        database_urls = set(re.findall(r"https://[A-Za-z0-9.-]+\.firebaseio\.com", html))
        findings = []
        if database_urls:
            findings.append(self._finding(
                Severity.info, "Firebase configuration detected in public frontend",
                "The frontend exposes Firebase configuration signals. Firebase client configuration is not automatically secret, but database and storage rules must enforce access control.",
                {"firebase_hosts": sorted(urlparse(url).netloc for url in database_urls)},
                "Review Firebase Realtime Database, Firestore, Storage, and Authentication rules; never treat frontend configuration as authorization.",
                0.95,
            ))
        for database_url in list(database_urls)[:2]:
            try:
                probe = await context.http.get(f"{database_url}/.json?shallow=true")
                if probe.status_code == 200 and probe.text.strip() not in {"null", "{}"}:
                    findings.append(self._finding(
                        Severity.high, "Firebase Realtime Database appears publicly readable",
                        "A read-only shallow database request returned data without an authenticated credential.",
                        {"firebase_host": urlparse(database_url).netloc, "status_code": probe.status_code},
                        "Require authentication and restrictive Firebase rules for every production path; remove public read access unless it is intentional.",
                        0.92,
                    ))
            except Exception:
                continue
        project_url = integration.get("firebase_project_url")
        project_id = self._firebase_project_id(project_url, html)
        if project_id:
            auth_headers = {"Authorization": f"Bearer {integration['firebase_access_token']}"} \
                if integration.get("firebase_access_token") else {}
            firestore = await context.http.get(
                f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents?pageSize=1",
                headers=auth_headers,
            )
            if firestore.status_code == 200:
                findings.append(self._finding(
                    Severity.medium, "Firestore document listing is accessible",
                    "The Firebase Firestore REST endpoint returned a successful document-list response for the connected project.",
                    {"firebase_project_id": project_id, "service": "firestore", "status_code": firestore.status_code},
                    "Require authentication and restrictive Firestore rules for production collections; verify that only intentional public documents are readable.",
                    0.9,
                ))
            bucket = f"{project_id}.appspot.com"
            storage = await context.http.get(
                f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o?maxResults=1",
                headers=auth_headers,
            )
            if storage.status_code == 200:
                findings.append(self._finding(
                    Severity.medium, "Firebase Storage object listing is accessible",
                    "The Firebase Storage REST endpoint returned a successful object-list response without a user session.",
                    {"bucket": bucket, "service": "storage", "status_code": storage.status_code},
                    "Require authentication and restrictive Storage rules; review public objects for personal data and signed URL leakage.",
                    0.9,
                ))
            if firebase_api_key:
                auth_config = await context.http.get(
                    f"https://identitytoolkit.googleapis.com/v1/projects/{project_id}/config?key={firebase_api_key}"
                )
                if auth_config.status_code == 200:
                    providers = auth_config.json().get("signIn", {}).get("allowDuplicateEmails", None)
                    findings.append(self._finding(
                        Severity.info, "Firebase Authentication configuration is reachable",
                        "Firebase Authentication project configuration was accessible with the frontend API key; provider policy should be reviewed in the Firebase console.",
                        {"firebase_project_id": project_id, "service": "authentication", "allow_duplicate_emails": providers},
                        "Review enabled providers, authorized domains, email enumeration controls, MFA, and abuse protections in Firebase Authentication.",
                        0.88,
                    ))
        return findings

    @staticmethod
    def _firebase_project_id(project_url: str | None, html: str) -> str | None:
        candidates = []
        if project_url:
            candidates.append(project_url)
        candidates.extend(re.findall(r"[\"']projectId[\"']\s*:\s*[\"']([^\"']+)", html))
        for candidate in candidates:
            host = urlparse(candidate).hostname or candidate
            path_parts = [part for part in urlparse(candidate).path.split("/") if part]
            if "project" in path_parts:
                index = path_parts.index("project")
                if index + 1 < len(path_parts):
                    return path_parts[index + 1]
            match = re.match(r"([A-Za-z0-9-]+)(?:\.firebaseio\.com|\.firebaseapp\.com)?$", host)
            if match:
                return match.group(1)
        return None

    async def _audit_logging(self, target: str, context: ScanContext) -> list[FindingResult]:
        base = f"{urlparse(target).scheme}://{urlparse(target).netloc}"
        paths = ("/logs", "/audit", "/audit-log", "/debug/logs", "/actuator/loggers")
        findings = []
        for path in paths:
            try:
                response = await context.http.get(urljoin(base, path), follow_redirects=False)
            except Exception:
                continue
            if response.status_code == 200 and response.text.strip():
                findings.append(self._finding(
                    Severity.high, "Potentially public audit or log endpoint",
                    "A common logging endpoint returned content without an authenticated request.",
                    {"url_path": path, "status_code": response.status_code, "content_length": len(response.content)},
                    "Require authentication, remove diagnostic routes from production, and ensure logs do not expose credentials or personal data.",
                    0.86,
                ))
        return findings

    async def _mobile_api(self, target: str, context: ScanContext) -> list[FindingResult]:
        base = f"{urlparse(target).scheme}://{urlparse(target).netloc}"
        candidates = ("/openapi.json", "/swagger.json", "/api-docs", "/api/openapi.json")
        for path in candidates:
            try:
                response = await context.http.get(urljoin(base, path))
            except Exception:
                continue
            if response.status_code == 200 and ("openapi" in response.text[:200].lower() or "swagger" in response.text[:200].lower()):
                return [self._finding(
                    Severity.info, "Public API specification discovered",
                    "An API description is publicly reachable and can help attackers enumerate mobile or public API operations.",
                    {"url_path": path, "status_code": response.status_code},
                    "Require authentication for private API specifications or intentionally publish only a minimized public contract; apply per-account and per-IP rate limits to API operations.",
                    0.94,
                )]
        return []

    async def _hosting(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await context.http.get(target)
        headers = {key.lower(): value for key, value in response.headers.items()}
        provider = None
        if "x-vercel-id" in headers or "x-vercel-cache" in headers:
            provider = "Vercel"
        elif "server" in headers and "netlify" in headers["server"].lower() or "x-nf-request-id" in headers:
            provider = "Netlify"
        elif "cf-ray" in headers or "server" in headers and "cloudflare" in headers["server"].lower():
            provider = "Cloudflare"
        findings = []
        if provider:
            findings.append(self._finding(
            Severity.info, f"{provider} hosting or edge layer detected",
            "Public response headers identify a hosting or CDN provider. Deep account and deployment settings require a connected provider integration.",
            {"provider": provider, "detected_headers": sorted(key for key in headers if key.startswith("x-") or key in {"server", "cf-ray"})[:20]},
            "Review provider access controls, deployment protection, preview exposure, origin shielding, and security headers in the provider dashboard.",
            0.95,
            ))
        integration = self._integration(context)
        if integration.get("vercel_token") and integration.get("vercel_project_id"):
            result = await context.http.get(
                f"https://api.vercel.com/v9/projects/{quote(integration['vercel_project_id'], safe='')}",
                headers={"Authorization": f"Bearer {integration['vercel_token']}"},
            )
            if result.status_code == 200:
                project = result.json()
                if project.get("passwordProtection") or project.get("ssoProtection"):
                    findings.append(self._finding(
                        Severity.info, "Vercel deployment protection is configured",
                        "The connected Vercel project reports deployment protection settings.",
                        {"provider": "Vercel", "password_protection": bool(project.get("passwordProtection")), "sso_protection": bool(project.get("ssoProtection"))},
                        "Keep preview and production deployment protection enabled for sensitive projects and review team access.", 0.95,
                    ))
        if integration.get("netlify_token") and integration.get("netlify_site_id"):
            result = await context.http.get(
                f"https://api.netlify.com/api/v1/sites/{quote(integration['netlify_site_id'], safe='')}",
                headers={"Authorization": f"Bearer {integration['netlify_token']}"},
            )
            if result.status_code == 200:
                site = result.json()
                if site.get("ssl_url") is None:
                    findings.append(self._finding(
                        Severity.high, "Connected Netlify site has no reported SSL URL",
                        "The provider API did not report an SSL URL for the connected site.",
                        {"provider": "Netlify", "site_id_redacted": True},
                        "Enable managed TLS and enforce HTTPS redirects for every production hostname.", 0.9,
                    ))
        if integration.get("cloudflare_api_token") and integration.get("cloudflare_zone_id"):
            result = await context.http.get(
                f"https://api.cloudflare.com/client/v4/zones/{quote(integration['cloudflare_zone_id'], safe='')}/settings/ssl",
                headers={"Authorization": f"Bearer {integration['cloudflare_api_token']}", "Content-Type": "application/json"},
            )
            if result.status_code == 200:
                ssl_value = result.json().get("result", {}).get("value")
                if ssl_value in {"off", "flexible"}:
                    findings.append(self._finding(
                        Severity.high, "Cloudflare zone is not using strict end-to-end TLS",
                        "The connected Cloudflare zone reports an SSL mode that may leave the origin connection unencrypted or downgradeable.",
                        {"provider": "Cloudflare", "ssl_mode": ssl_value},
                        "Use Full (strict) TLS, install a valid origin certificate, and enforce HTTPS redirects.", 0.98,
                    ))
        return findings

    async def _ddos_resilience(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await context.http.get(target, follow_redirects=False)
        headers = {key.lower(): value for key, value in response.headers.items()}
        if not any(key in headers for key in ("cf-ray", "x-vercel-id", "x-cache", "x-served-by")):
            return [self._finding(
                Severity.info, "No public edge-protection signal detected",
                "The response does not expose a common CDN or edge-cache signal. This passive check cannot prove DDoS vulnerability and does not generate attack traffic.",
                {"status_code": response.status_code, "safe_probe": True},
                "Confirm that volumetric protection, origin rate limits, autoscaling, and an incident runbook are configured with your hosting provider.",
                0.65,
            )]
        return []

    async def _tenant_isolation(self, target: str, context: ScanContext) -> list[FindingResult]:
        integration = self._integration(context)
        config = integration.get("tenant")
        if not config:
            return self._integration_required("Two authorized tenant actors and resource paths are required.")
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return self._integration_required("The worker browser runtime is required for tenant isolation testing.")
        origin = urlparse(target).netloc
        findings = []
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True, args=["--no-sandbox"])
            contexts = []
            try:
                for actor_name in ("actor_a", "actor_b"):
                    browser_context = await browser.new_context(ignore_https_errors=bool(context.ssl_error))
                    contexts.append(browser_context)
                    page = await browser_context.new_page()
                    login_url = urljoin(target, config.get("login_url") or "/login")
                    if urlparse(login_url).netloc != origin:
                        raise ValueError("tenant login_url must remain on the target origin")
                    actor = config[actor_name]
                    await page.goto(login_url, wait_until="domcontentloaded", timeout=10_000)
                    await page.locator(config["identifier_selector"]).fill(actor["identifier"])
                    await page.locator(config["password_selector"]).fill(actor["password"])
                    await page.locator(config["submit_selector"]).click(timeout=10_000)
                    await page.wait_for_timeout(750)
                    for resource_path in config["resource_paths"]:
                        url = urljoin(target, resource_path)
                        if urlparse(url).netloc != origin:
                            continue
                        response = await page.goto(url, wait_until="domcontentloaded", timeout=10_000)
                        body = (await page.locator("body").inner_text())[:50_000]
                        if actor_name == "actor_a":
                            context.security_test_runtime.setdefault("tenant_resources", {})[resource_path] = {
                                "actor_a_status": response.status if response else None,
                                "actor_a_body_length": len(body),
                            }
                        else:
                            actor_a = context.security_test_runtime.get("tenant_resources", {}).get(resource_path, {})
                            if actor_a.get("actor_a_status") == 200 and response and response.status == 200 and len(body) > 0:
                                findings.append(self._finding(
                                    Severity.high, "Potential cross-tenant resource access",
                                    "The second authorized tenant received a successful non-empty response for a resource path designated as belonging to the first tenant.",
                                    {"resource_path": resource_path, "actor_a_status": actor_a.get("actor_a_status"), "actor_b_status": response.status, "body_length": len(body)},
                                    "Enforce tenant ownership in server-side authorization for every object and test with distinct tenant fixtures; never rely on hidden UI controls.",
                                    0.76,
                                ))
            finally:
                for browser_context in contexts:
                    await browser_context.close()
                await browser.close()
        return findings

    def _integration_required(self, description: str) -> list[FindingResult]:
        return [self._finding(
            Severity.info, f"{self.scan_type.replace('_', ' ').title()} requires an authorized integration",
            description,
            {"scan_mode": "integration_required", "url_only_result": False},
            "Connect the required repository, cloud project, or authorized test actors before treating this scanner as complete.",
            1.0,
        )]

    def _finding(self, severity, title, description, evidence, remediation, confidence):
        return FindingResult(severity, title, description, evidence, remediation, confidence=confidence)
