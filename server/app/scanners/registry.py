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
                              XssSurfaceScanner)

SCANNERS: tuple[type[BaseScanner], ...] = (SecurityHeadersScanner, SslTlsScanner,
    ApiKeyExposureScanner, CorsScanner, DnsEmailScanner, CookieSecurityScanner, DebugEndpointsScanner,
    XssSurfaceScanner, OpenRedirectScanner, JwtSecurityScanner, GraphqlSecurityScanner,
    CsrfProtectionScanner, TechStackCveScanner, IdorAccessControlScanner, SeoScanner, AeoScanner,
    PerformanceBasicsScanner, AccessibilityBasicsScanner, FileUploadSecurityScanner)


def get_scanners() -> list[BaseScanner]:
    return [scanner() for scanner in SCANNERS]
