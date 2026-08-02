import asyncio
import base64
import binascii
import json
import re
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


SENSITIVE_TABLE_WORDS = (
    "user", "profile", "account", "payment", "billing", "invoice", "order",
    "transaction", "subscription", "secret", "token", "credential", "admin",
)
JWT_PATTERN = re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")


def _contains_service_role_jwt(text: str) -> bool:
    for token in JWT_PATTERN.findall(text):
        try:
            payload = token.split(".")[1]
            payload += "=" * (-len(payload) % 4)
            data = json.loads(base64.urlsafe_b64decode(payload).decode())
        except (binascii.Error, ValueError, UnicodeDecodeError, json.JSONDecodeError):
            continue
        if data.get("role") == "service_role":
            return True
    return False


def _finding(severity: Severity, title: str, description: str, evidence: dict[str, Any],
             remediation: str, confidence: float = 0.95) -> FindingResult:
    return FindingResult(
        severity=severity,
        title=f"Supabase: {title}",
        description=f"Detected through the project's connected Supabase instance. {description}",
        evidence={"source": "supabase_connection", **evidence},
        remediation=remediation,
        confidence=confidence,
    )


class SupabaseSecurityScanner(BaseScanner):
    name = "supabase_security"
    category = "configuration"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        if not context.supabase:
            return []
        connection = context.supabase
        if "anon_key" not in connection:
            return [_finding(
                Severity.high,
                "connected credentials are unavailable",
                "The stored Supabase credentials could not be decrypted, so connected-project checks were not completed.",
                {"credentials": "redacted"},
                "Reconnect Supabase with valid credentials and ensure SUPABASE_ENCRYPTION_KEY remains stable across deployments.",
                1.0,
            )]
        findings: list[FindingResult] = []
        page_text, script_texts = await self._frontend_content(target, context)
        frontend_text = "\n".join([page_text, *script_texts])
        service_role_key = connection.get("service_role_key", "")
        anon_key = connection["anon_key"]
        project_url = connection["project_url"]

        if (service_role_key and service_role_key in frontend_text) or _contains_service_role_jwt(frontend_text):
            findings.append(_finding(
                Severity.critical,
                "service_role key exposed in frontend code",
                "A privileged Supabase service_role credential was found in live HTML or JavaScript.",
                {"secret_type": "service_role_key", "value_redacted": True},
                "Remove the service_role key from all client-delivered code, rotate it immediately, and use a server-side secret store.",
                1.0,
            ))
        if anon_key in frontend_text:
            findings.append(_finding(
                Severity.info,
                "anon key is present in frontend code",
                "Supabase anon keys are designed to be public, but frontend access must be protected by strict RLS policies.",
                {"secret_type": "anon_key", "value_redacted": True},
                "Keep only the public anon key in frontend code and enforce least-privilege RLS policies for every exposed table.",
                1.0,
            ))
        if project_url in frontend_text and (
            anon_key in frontend_text or (service_role_key and service_role_key in frontend_text)
        ):
            findings.append(_finding(
                Severity.medium,
                "Supabase URL and credential are bundled together",
                "The frontend contains the Supabase project URL alongside a credential; verify that only the intended anon key is present and that RLS blocks unauthorized data access.",
                {"project_url": project_url, "keys_redacted": True},
                "Keep service credentials server-side, rotate any leaked credential, and validate RLS with anonymous requests.",
                1.0,
            ))

        schema, schema_status = await self._fetch_schema(project_url, anon_key, context)
        if schema_status == 200 and schema:
            findings.extend(await self._check_tables(project_url, anon_key, schema, context))
        elif schema_status not in (401, 403, 404):
            findings.append(_finding(
                Severity.low,
                "database schema could not be inspected",
                "The connected credentials did not expose the Supabase REST schema, so table-level anonymous access could not be verified.",
                {"endpoint": "/rest/v1/", "status_code": schema_status},
                "Confirm the project URL and anon key, then validate RLS and policies using Supabase SQL or the dashboard.",
                0.8,
            ))

        findings.extend(await self._check_auth_settings(project_url, anon_key, context))
        findings.extend(await self._check_storage(project_url, anon_key, context))
        return findings

    async def _frontend_content(self, target: str, context: ScanContext) -> tuple[str, list[str]]:
        try:
            response = await context.http.get(target)
        except Exception:
            return "", []
        html = response.text[:2_000_000]
        soup = BeautifulSoup(html, "html.parser")
        script_urls = [urljoin(str(response.url), tag.get("src")) for tag in soup.find_all("script", src=True)]
        script_urls = list(dict.fromkeys(script_urls))[:25]
        same_origin = urlparse(target).netloc
        script_urls = [url for url in script_urls if urlparse(url).netloc == same_origin]
        responses = await asyncio.gather(*(self._get_text(context, url) for url in script_urls))
        return html, [text for text in responses if text]

    async def _get_text(self, context: ScanContext, url: str) -> str:
        try:
            response = await context.http.get(url)
            return response.text[:4_000_000]
        except Exception:
            return ""

    async def _fetch_json(self, context: ScanContext, url: str, anon_key: str) -> tuple[Any, int]:
        try:
            response = await context.http.get(url, headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {anon_key}",
            })
            try:
                return response.json(), response.status_code
            except ValueError:
                return None, response.status_code
        except Exception:
            return None, 0

    async def _fetch_schema(self, project_url: str, anon_key: str,
                            context: ScanContext) -> tuple[dict[str, Any] | None, int]:
        data, status = await self._fetch_json(context, f"{project_url}/rest/v1/", anon_key)
        return data if isinstance(data, dict) else None, status

    async def _check_tables(self, project_url: str, anon_key: str, schema: dict[str, Any],
                            context: ScanContext) -> list[FindingResult]:
        paths = schema.get("paths", {})
        tables = [path.strip("/") for path in paths if path.startswith("/") and "/" not in path.strip("/")]
        tables = list(dict.fromkeys(tables))[:50]

        async def probe(table: str) -> tuple[str, int]:
            _data, status = await self._fetch_json(
                context, f"{project_url}/rest/v1/{table}?select=*&limit=1", anon_key
            )
            return table, status

        results = await asyncio.gather(*(probe(table) for table in tables))
        findings: list[FindingResult] = []
        for table, status in results:
            if status != 200:
                continue
            sensitive = any(word in table.lower() for word in SENSITIVE_TABLE_WORDS)
            findings.append(_finding(
                Severity.high if sensitive else Severity.medium,
                f"anonymous read access detected for table `{table}`",
                "The anon credential received a successful row response. This indicates a public policy or disabled RLS; the REST API cannot distinguish the exact cause.",
                {"table": table, "status_code": status, "rls_verification": "effective_anonymous_read"},
                f"Enable RLS on `{table}` and replace broad policies with least-privilege policies tied to authenticated users and intended roles.",
                1.0,
            ))
        return findings

    async def _check_auth_settings(self, project_url: str, anon_key: str,
                                   context: ScanContext) -> list[FindingResult]:
        data, status = await self._fetch_json(context, f"{project_url}/auth/v1/settings", anon_key)
        if status != 200 or not isinstance(data, dict):
            return []
        findings: list[FindingResult] = []
        if data.get("mailer_autoconfirm") is True:
            findings.append(_finding(
                Severity.medium,
                "email auto-confirmation is enabled",
                "Auth settings indicate users may access the application before confirming ownership of their email address.",
                {"setting": "mailer_autoconfirm", "value": True},
                "Disable automatic email confirmation unless it is an intentional, documented product requirement.",
            ))
        return findings

    async def _check_storage(self, project_url: str, anon_key: str,
                             context: ScanContext) -> list[FindingResult]:
        data, status = await self._fetch_json(context, f"{project_url}/storage/v1/bucket", anon_key)
        if status != 200 or not isinstance(data, list):
            return []
        findings: list[FindingResult] = []
        for bucket in data:
            if not isinstance(bucket, dict) or not bucket.get("public"):
                continue
            name = str(bucket.get("name", "unknown"))
            sensitive = any(word in name.lower() for word in SENSITIVE_TABLE_WORDS)
            findings.append(_finding(
                Severity.high if sensitive else Severity.medium,
                f"public storage bucket `{name}` detected",
                "The connected anon credential can enumerate a bucket marked public.",
                {"bucket": name, "public": True},
                f"Make `{name}` private unless public delivery is intentional, and use signed URLs with least-privilege storage policies.",
            ))
        return findings
