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

SCANNERS: tuple[type[BaseScanner], ...] = (SecurityHeadersScanner, SslTlsScanner,
    ApiKeyExposureScanner, CorsScanner, DnsEmailScanner, CookieSecurityScanner, DebugEndpointsScanner,
    XssSurfaceScanner, SriScanner, MixedContentScanner, OpenRedirectScanner, JwtSecurityScanner, GraphqlSecurityScanner,
    CsrfProtectionScanner, TechStackCveScanner, IdorAccessControlScanner, SeoScanner, AeoScanner,
    PerformanceBasicsScanner, AccessibilityBasicsScanner, FileUploadSecurityScanner,
    ComplianceCheckScanner)


def get_scanners(include_supabase: bool = False) -> list[BaseScanner]:
    scanner_types = SCANNERS + ((SupabaseSecurityScanner,) if include_supabase else ())
    return [scanner() for scanner in scanner_types]


def get_security_test_scanners(scan_type: str) -> list[BaseScanner]:
    if scan_type == "sql_injection":
        return [SqlInjectionScanner()]
    if scan_type == "xss_active":
        return [ActiveXssScanner()]
    return []
