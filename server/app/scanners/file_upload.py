import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


class FileUploadSecurityScanner(BaseScanner):
    name, category = "file_upload_security", "vulnerability"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await context.http.get(target)
        soup = BeautifulSoup(response.text[:2_000_000], "html.parser")
        findings: list[FindingResult] = []
        upload_forms = []
        for form in soup.find_all("form"):
            action = urljoin(target, form.get("action", ""))
            file_inputs = form.find_all("input", attrs={"type": re.compile(r"^file$", re.I)})
            upload_hint = bool(file_inputs or re.search(r"(?:upload|import|attach|media|avatar|document)", action, re.I))
            if upload_hint:
                upload_forms.append((form, action, file_inputs))
        upload_links = [urljoin(target, tag.get("href", "")) for tag in soup.find_all("a", href=True)
                        if re.search(r"(?:upload|import|attach|media)", tag.get("href", ""), re.I)]
        if not upload_forms and not upload_links:
            return findings
        if upload_forms:
            missing_accept = [action for form, action, file_inputs in upload_forms
                              if any(not field.get("accept") for field in file_inputs)]
            if missing_accept:
                findings.append(FindingResult(Severity.medium, "Upload controls lack file type hints", "Detected file upload controls do not restrict expected types with an accept attribute.",
                                              {"forms": len(missing_accept), "examples": missing_accept[:5]},
                                              "Treat accept as a usability hint only and enforce an allowlist of file types and content types server-side."))
            dangerous = [field.get("accept", "") for form, _action, fields in upload_forms for field in fields
                         if re.search(r"(?:php|phtml|phar|jsp|jspx|asp|aspx|exe|sh|html?)", field.get("accept", ""), re.I)]
            if dangerous:
                findings.append(FindingResult(Severity.high, "Upload accepts potentially executable extensions", "A public upload form advertises extensions that can be interpreted as code or active content.",
                                              {"accept_values": dangerous[:5]},
                                              "Allow only required non-executable types, validate content signatures server-side, store uploads outside the web root, and serve them with safe content types."))
            for _form, action, fields in upload_forms:
                if not action or action == target:
                    findings.append(FindingResult(Severity.info, "Upload endpoint requires server-side validation review", "A file upload surface was found, but client HTML cannot prove content-type, size, malware, or storage validation.",
                                                  {"action": action or target, "file_inputs": len(fields)},
                                                  "Enforce size limits, allowlisted MIME/signature checks, malware scanning, authorization, and non-executable storage on the server.",
                                                  confidence=0.85))
        if upload_links and not upload_forms:
            findings.append(FindingResult(Severity.info, "Possible upload endpoint discovered", "A link suggests an upload or import workflow, but no form was submitted or tested.",
                                          {"urls": upload_links[:5]}, "Review the endpoint for authentication, authorization, type validation, size limits, and safe storage."))
        return findings
