from app.scanners.base import BaseScanner
from app.scanners.accessibility import AccessibilityBasicsScanner
from app.scanners.aeo import AeoScanner
from app.scanners.file_upload import FileUploadSecurityScanner
from app.scanners.infrastructure import DnsEmailScanner, SslTlsScanner
from app.scanners.performance import PerformanceBasicsScanner
from app.scanners.seo import SeoScanner
from app.scanners.vulnerability.csrf_protection import CsrfProtectionScanner
from app.scanners.vulnerability.graphql_security import GraphqlSecurityScanner
from app.scanners.vulnerability.idor_access_control import IdorAccessControlScanner
from app.scanners.vulnerability.jwt_security import JwtSecurityScanner
from app.scanners.vulnerability.tech_stack_cve import TechStackCveScanner
from app.scanners.web import (ApiKeyExposureScanner, CookieSecurityScanner, CorsScanner,
                              DebugEndpointsScanner, OpenRedirectScanner, SecurityHeadersScanner,
                              XssSurfaceScanner, SriScanner, MixedContentScanner)
from app.scanners.supabase_security import SupabaseSecurityScanner
from app.scanners.compliance import ComplianceCheckScanner
from app.scanners.sqli import SqlInjectionScanner
from app.scanners.xss_active import ActiveXssScanner
from app.scanners.authentication import AuthenticationFlowScanner
from app.scanners.browser_storage import BrowserStorageScanner
from app.scanners.domain_watchtower import DomainWatchtowerScanner
from app.scanners.exposed_artifacts import ExposedArtifactsScanner
from app.scanners.input_validation import InputValidationScanner
from app.scanners.extended_security import ExtendedSecurityScanner
from app.scanners.strict_checks import (CacheControlSecurityScanner, CanonicalUrlScanner,
    CspDeepAuditScanner, HreflangScanner, HttpMethodScanner, ImageSeoScanner,
    LinkIntegrityScanner, MobileReadinessScanner, OpenGraphScanner,
    PermissionsPolicyScanner, PrivacySignalScanner, SecurityTxtScanner,
    SitemapIntegrityScanner, StructuredDataScanner)

SCANNERS: tuple[type[BaseScanner], ...] = (SecurityHeadersScanner, SslTlsScanner,
    ApiKeyExposureScanner, CorsScanner, DnsEmailScanner, CookieSecurityScanner, DebugEndpointsScanner,
    XssSurfaceScanner, SriScanner, MixedContentScanner, OpenRedirectScanner, JwtSecurityScanner, GraphqlSecurityScanner,
    CsrfProtectionScanner, TechStackCveScanner, IdorAccessControlScanner, SeoScanner, AeoScanner,
    PerformanceBasicsScanner, AccessibilityBasicsScanner, FileUploadSecurityScanner,
    ComplianceCheckScanner, ExposedArtifactsScanner, BrowserStorageScanner,
    InputValidationScanner, DomainWatchtowerScanner, CspDeepAuditScanner,
    PermissionsPolicyScanner, CacheControlSecurityScanner, HttpMethodScanner,
    SecurityTxtScanner, SitemapIntegrityScanner, CanonicalUrlScanner,
    HreflangScanner, StructuredDataScanner, OpenGraphScanner, ImageSeoScanner,
    MobileReadinessScanner, LinkIntegrityScanner, PrivacySignalScanner)


def get_scanners(include_supabase: bool = False) -> list[BaseScanner]:
    scanner_types = SCANNERS + ((SupabaseSecurityScanner,) if include_supabase else ())
    return [scanner() for scanner in scanner_types]


def get_security_test_scanners(scan_type: str) -> list[BaseScanner]:
    if scan_type == "sql_injection":
        return [SqlInjectionScanner()]
    if scan_type == "xss_active":
        return [ActiveXssScanner()]
    if scan_type == "authentication_flow":
        return [AuthenticationFlowScanner()]
    if scan_type in {
        "github_sast", "dependencies", "firebase", "tenant_isolation",
        "audit_logging", "ddos_resilience", "mobile_api", "hosting_security",
    }:
        return [ExtendedSecurityScanner(scan_type)]
    return []


def get_scanner_by_name(name: str) -> BaseScanner | None:
    for scanner_type in SCANNERS + (SupabaseSecurityScanner, SqlInjectionScanner, ActiveXssScanner, AuthenticationFlowScanner):
        instance = scanner_type()
        if instance.name == name:
            return instance
    if name.startswith("extended_") or name in {
        "github_sast", "dependencies", "firebase", "tenant_isolation",
        "audit_logging", "ddos_resilience", "mobile_api", "hosting_security",
    }:
        return ExtendedSecurityScanner(name)
    return None


