import re

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


class AccessibilityBasicsScanner(BaseScanner):
    name, category = "accessibility_basics", "accessibility"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await context.http.get(target)
        soup = BeautifulSoup(response.text[:2_000_000], "html.parser")
        findings: list[FindingResult] = []
        html_tag = soup.find("html")
        if not html_tag or not html_tag.get("lang"):
            findings.append(FindingResult(Severity.medium, "HTML language is missing", "Assistive technologies cannot reliably select pronunciation and language rules.",
                                          {"element": "html"}, "Set an accurate lang attribute on the root html element."))
        images = soup.find_all("img")
        missing_alt = [img.get("src", "")[:160] for img in images if img.get("alt") is None]
        if missing_alt:
            findings.append(FindingResult(Severity.medium, "Images lack alt attributes", "Images without alt attributes are not represented to screen readers.",
                                          {"missing": len(missing_alt), "examples": missing_alt[:5]},
                                          "Provide useful alt text, or alt=\"\" for purely decorative images."))
        inputs_without_labels = []
        labels_for = {label.get("for") for label in soup.find_all("label") if label.get("for")}
        for field in soup.find_all(["input", "select", "textarea"]):
            if field.get("type", "").lower() in {"hidden", "submit", "button", "reset"}:
                continue
            if not field.get("aria-label") and not field.get("aria-labelledby") and not (field.get("id") and field.get("id") in labels_for):
                inputs_without_labels.append(field.get("name") or field.get("id") or field.name)
        if inputs_without_labels:
            findings.append(FindingResult(Severity.medium, "Form controls lack labels", "Some controls have no associated visible label or accessible name.",
                                          {"missing": len(inputs_without_labels), "examples": inputs_without_labels[:5]},
                                          "Associate every form control with a label or an appropriate accessible name."))
        landmarks = soup.find_all(["main", "nav", "header", "footer", "aside"])
        skip_link = soup.find("a", href=re.compile(r"#(main|content|skip)", re.I))
        if not landmarks:
            findings.append(FindingResult(Severity.low, "Landmark regions are missing", "The page has no semantic landmark elements to help users navigate by region.",
                                          {"landmarks": 0}, "Use main, nav, header, footer, and aside elements to define page regions."))
        if not skip_link and not soup.find(attrs={"id": re.compile(r"^(main|content)$", re.I)}):
            findings.append(FindingResult(Severity.info, "Skip navigation is not evident", "No skip link or obvious main-content target was found in the initial HTML.",
                                          {"skip_link": False}, "Add a keyboard-accessible skip-to-content link before the main navigation."))
        contrast_hints = [tag.get("style", "") for tag in soup.find_all(style=True)
                          if re.search(r"(?:color|background(?:-color)?)\s*:", tag.get("style", ""), re.I)]
        if contrast_hints:
            findings.append(FindingResult(Severity.info, "Inline color styles require contrast review", "Color declarations were found, but contrast cannot be reliably calculated without rendered styles.",
                                          {"style_count": len(contrast_hints)}, "Check text and background combinations against WCAG contrast ratios in a rendered audit."))
        return findings
