from io import BytesIO
from xml.sax.saxutils import escape

from app.schemas.scans import ScanRead


def _report_summary(scan):
    """Build the computed report summary used by the API response and exports."""
    return ScanRead.model_validate(scan).report


def report_markdown(scan, brand_name: str | None = None) -> str:
    title = brand_name or "Scanlyst"
    report = _report_summary(scan)
    lines = [f"# {title} Security Report", "", f"Target: `{scan.url}`", f"Overall score: **{report.global_score:.1f}**", f"Risk level: **{report.risk_level}**", "", "## Summary", report.executive_summary, "", "## Findings"]
    for finding in scan.findings:
        severity = finding.severity.value if hasattr(finding.severity, "value") else str(finding.severity)
        lines.extend([f"### [{severity.upper()}] {finding.title}", finding.description,
                      f"**Evidence:** `{finding.evidence}`", f"**Remediation:** {finding.remediation}", ""])
    return "\n".join(lines)


def report_pdf(scan, brand_name: str | None = None, accent_color: str = "#2563eb") -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    except ImportError as error:
        raise RuntimeError("PDF export requires reportlab") from error
    buffer = BytesIO()
    styles = getSampleStyleSheet()
    report = _report_summary(scan)
    story = [Paragraph(escape(brand_name or "Scanlyst Security Report"), styles["Title"]),
             Paragraph(escape(f"Target: {scan.url}"), styles["Normal"]),
             Paragraph(escape(f"Overall score: {report.global_score:.1f} | Risk: {report.risk_level}"), styles["Normal"]),
             Spacer(1, 0.2 * inch), Paragraph(escape(report.executive_summary), styles["BodyText"]), Spacer(1, 0.2 * inch)]
    for finding in scan.findings:
        severity = finding.severity.value if hasattr(finding.severity, "value") else str(finding.severity)
        story.extend([Paragraph(f"<b>[{escape(severity.upper())}] {escape(finding.title)}</b>", styles["Heading3"]),
                      Paragraph(escape(finding.description), styles["BodyText"]),
                      Paragraph(f"<b>Remediation:</b> {escape(finding.remediation)}", styles["BodyText"]),
                      Spacer(1, 0.12 * inch)])
    SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.6 * inch, leftMargin=0.6 * inch,
                      topMargin=0.6 * inch, bottomMargin=0.6 * inch).build(story)
    return buffer.getvalue()
