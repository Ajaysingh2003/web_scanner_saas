import asyncio
import re
import socket
import ssl
from datetime import datetime, timezone
from urllib.parse import urlparse

import dns.asyncresolver
from cryptography import x509
from cryptography.x509.oid import NameOID

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


class SslTlsScanner(BaseScanner):
    name, category = "ssl_tls", "infrastructure"

    @staticmethod
    def _certificate_report(hostname: str, port: int) -> dict:
        insecure_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        insecure_context.check_hostname = False
        insecure_context.verify_mode = ssl.CERT_NONE
        with socket.create_connection((hostname, port), timeout=10) as raw_socket:
            with insecure_context.wrap_socket(raw_socket, server_hostname=hostname) as tls_socket:
                certificate = x509.load_der_x509_certificate(tls_socket.getpeercert(binary_form=True))
                try:
                    san_extension = certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName)
                    sans = [name.value for name in san_extension.value if isinstance(name, x509.DNSName)]
                except x509.ExtensionNotFound:
                    sans = []
                common_names = [attribute.value for attribute in certificate.subject.get_attributes_for_oid(NameOID.COMMON_NAME)]
                subject = certificate.subject.rfc4514_string()
                issuer = certificate.issuer.rfc4514_string()
                try:
                    signature_algorithm = certificate.signature_hash_algorithm.name
                except (AttributeError, ValueError):
                    signature_algorithm = None
                report = {
                    "not_before": certificate.not_valid_before_utc,
                    "not_after": certificate.not_valid_after_utc,
                    "issuer": issuer,
                    "subject": subject,
                    "common_names": common_names,
                    "dns_names": sans,
                    "signature_algorithm": signature_algorithm,
                    "tls_version": tls_socket.version(),
                }
        try:
            hostname_context = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=10) as raw_socket:
                with hostname_context.wrap_socket(raw_socket, server_hostname=hostname):
                    report["certificate_trusted"] = True
        except ssl.SSLCertVerificationError as error:
            report["certificate_trusted"] = False
            report["verification_error"] = str(error)
        return report

    @staticmethod
    def _supports_tls_version(hostname: str, port: int, version: ssl.TLSVersion) -> bool:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        context.minimum_version = version
        context.maximum_version = version
        # Legacy protocols are often disabled by OpenSSL security defaults.
        context.set_ciphers("DEFAULT:@SECLEVEL=0")
        try:
            with socket.create_connection((hostname, port), timeout=5) as raw_socket:
                with context.wrap_socket(raw_socket, server_hostname=hostname):
                    return True
        except (OSError, ssl.SSLError):
            return False

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        parsed = urlparse(target)
        if parsed.scheme != "https" or not parsed.hostname:
            return [FindingResult(Severity.high, "Target is not using HTTPS",
                                  "The submitted URL uses plain HTTP.", {"url": target},
                                  "Serve the site over HTTPS and redirect HTTP to HTTPS.")]
        findings: list[FindingResult] = []
        try:
            certificate = await asyncio.to_thread(
                self._certificate_report, parsed.hostname, parsed.port or 443
            )
            now = datetime.now(timezone.utc)
            expired = False
            not_yet_valid = False
            if certificate.get("not_after"):
                expiry = certificate["not_after"]
                remaining = (expiry - now).total_seconds()
                if remaining < 0:
                    expired = True
                    findings.append(FindingResult(
                        Severity.critical, "TLS certificate is expired",
                        "The server certificate is past its validity period.",
                        {"hostname": parsed.hostname, "not_after": expiry.isoformat()},
                        "Renew and deploy a trusted certificate before accepting production traffic.",
                    ))
                elif remaining < 30 * 24 * 60 * 60:
                    findings.append(FindingResult(
                        Severity.high, "TLS certificate expires soon",
                        "The server certificate expires within the next 30 days.",
                        {"hostname": parsed.hostname, "not_after": expiry.isoformat(),
                         "days_remaining": round(remaining / 86400, 1)},
                        "Renew the certificate and verify automated renewal before expiry.",
                    ))
            if certificate.get("not_before"):
                not_before = certificate["not_before"]
                if not_before > now:
                    not_yet_valid = True
                    findings.append(FindingResult(
                        Severity.high, "TLS certificate is not yet valid",
                        "The server certificate validity starts in the future.",
                        {"hostname": parsed.hostname, "not_before": not_before.isoformat()},
                        "Deploy a certificate whose validity period includes the current time.",
                    ))
            if certificate.get("issuer") == certificate.get("subject"):
                findings.append(FindingResult(
                    Severity.high, "TLS certificate appears self-signed",
                    "The certificate issuer and subject are identical, indicating a likely self-signed certificate.",
                    {"hostname": parsed.hostname, "issuer": certificate.get("issuer")},
                    "Use a certificate issued by a publicly trusted certificate authority.",
                ))
            hostname_matches = any(
                ssl._dnsname_match(pattern, parsed.hostname)
                for pattern in certificate.get("dns_names", []) + certificate.get("common_names", [])
            )
            if not hostname_matches:
                findings.append(FindingResult(
                    Severity.high, "TLS certificate hostname mismatch",
                    "The certificate does not identify the requested hostname.",
                    {"hostname": parsed.hostname, "dns_names": certificate.get("dns_names", []),
                     "common_names": certificate.get("common_names", [])},
                    "Issue and deploy a certificate containing the exact hostname or an appropriate DNS name.",
                ))
            signature = (certificate.get("signature_algorithm") or "").lower()
            if signature in {"md5", "sha1"}:
                findings.append(FindingResult(
                    Severity.high, "TLS certificate uses a weak signature algorithm",
                    f"The certificate is signed with the deprecated {signature.upper()} algorithm.",
                    {"hostname": parsed.hostname, "signature_algorithm": signature},
                    "Replace the certificate with one signed using SHA-256 or a stronger modern algorithm.",
                ))
            if not certificate.get("certificate_trusted") and not expired and not_yet_valid is False:
                findings.append(FindingResult(
                    Severity.high, "Invalid or incomplete TLS certificate chain",
                    "The certificate could not be validated by the system trust store.",
                    {"hostname": parsed.hostname, "error": certificate.get("verification_error")},
                    "Install the complete certificate chain from a publicly trusted certificate authority.",
                ))
        except ssl.SSLCertVerificationError as exc:
            findings.append(FindingResult(
                Severity.high, "TLS certificate validation failed",
                "The certificate could not be validated against the system trust store.",
                {"hostname": parsed.hostname, "error": str(exc)},
                "Install a valid certificate with a complete trusted chain for the hostname.",
            ))
        except (OSError, ssl.SSLError, ValueError) as exc:
            findings.append(FindingResult(
                Severity.medium, "TLS certificate could not be inspected",
                "The TLS handshake completed poorly or certificate metadata could not be inspected.",
                {"hostname": parsed.hostname, "error": type(exc).__name__},
                "Verify the certificate chain and TLS configuration from an external monitor.",
                confidence=0.7,
            ))

        for version, label in ((ssl.TLSVersion.TLSv1, "TLS 1.0"), (ssl.TLSVersion.TLSv1_1, "TLS 1.1")):
            if await asyncio.to_thread(self._supports_tls_version, parsed.hostname, parsed.port or 443, version):
                findings.append(FindingResult(
                    Severity.high, f"{label} is supported",
                    f"The server accepted a connection using the obsolete {label} protocol.",
                    {"hostname": parsed.hostname, "protocol": label},
                    "Disable TLS 1.0 and TLS 1.1 and require TLS 1.2 or newer.",
                ))

        return findings


class DnsEmailScanner(BaseScanner):
    name, category = "dns_email_security", "infrastructure"
    dkim_selectors = ("google", "selector1", "selector2", "default", "dkim", "mail", "s1", "s2", "k1", "mandrill")

    async def scan(self, target, context):
        domain = urlparse(target).hostname
        if not domain:
            return []
        resolver = context.dns or dns.asyncresolver.Resolver()
        findings = []
        async def txt(name):
            try:
                answers = await resolver.resolve(name, "TXT")
                return [b"".join(record.strings).decode(errors="replace") for record in answers]
            except Exception:
                return []
        spf, dmarc = await asyncio.gather(txt(domain), txt(f"_dmarc.{domain}"))
        if not any(record.lower().startswith("v=spf1") for record in spf):
            findings.append(FindingResult(Severity.medium, "SPF record missing", "No SPF policy was found for the domain.",
                                          {"domain": domain}, "Publish an SPF TXT record authorizing only your legitimate senders."))
        if not any(record.lower().startswith("v=dmarc1") for record in dmarc):
            findings.append(FindingResult(Severity.medium, "DMARC record missing", "No DMARC policy was found for the domain.",
                                          {"domain": domain}, "Publish a DMARC record, start with p=none, and review aggregate reports."))
        dkim_records = {}
        for selector in self.dkim_selectors:
            records = await txt(f"{selector}._domainkey.{domain}")
            if records:
                dkim_records[selector] = records
        valid_dkim = [selector for selector, records in dkim_records.items()
                      if any("v=dkim1" in record.lower() and re.search(r"(?:^|;)\s*p\s*=\s*[^;\s]+", record, re.I)
                             for record in records)]
        malformed_dkim = [selector for selector in dkim_records if selector not in valid_dkim]
        if not valid_dkim and not malformed_dkim:
            findings.append(FindingResult(
                Severity.medium, "DKIM record was not found",
                "No DKIM TXT record was found for the common selectors checked; outbound mail may not be cryptographically signed.",
                {"domain": domain, "selectors_checked": list(self.dkim_selectors)},
                "Publish a DKIM public key at selector._domainkey.example.com using the selector configured by your mail provider.",
                confidence=0.7))
        if malformed_dkim:
            findings.append(FindingResult(
                Severity.high, "DKIM record is malformed",
                "A discovered DKIM selector does not contain a valid v=DKIM1 public-key record.",
                {"selectors": malformed_dkim},
                "Publish a valid DKIM1 TXT record with a non-empty p= public key."))
        return findings
