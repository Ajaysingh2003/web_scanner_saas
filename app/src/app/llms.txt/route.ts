import { siteConfig } from "@/lib/site-config";

export function GET() {
  const content = `# Scanlyst

> Scanlyst is a web-based website audit platform for security vulnerabilities, technical SEO, AI-search readiness, Core Web Vitals, accessibility, compliance, infrastructure, and continuous monitoring.

## Canonical website
${siteConfig.url}

## Primary public pages
- Product overview: ${siteConfig.url}/
- Scanner catalog: ${siteConfig.url}/scans
- Audit solutions: ${siteConfig.url}/solutions
- Pricing: ${siteConfig.url}/pricing
- Responsible disclosure: ${siteConfig.url}/responsible-disclosure
- Privacy policy: ${siteConfig.url}/privacy
- Terms of service: ${siteConfig.url}/terms

## Core capabilities
- Authorized, non-destructive website security scanning
- Evidence-backed vulnerability and configuration findings
- Technical SEO, structured data, canonical, sitemap, and crawler checks
- AI and answer-engine crawler readiness analysis
- Core Web Vitals and website performance analysis
- WCAG-oriented automated accessibility checks
- Scheduled monitoring, reports, exports, and secure share links

## Important limitations
Scanlyst provides automated signals and remediation guidance. It does not replace an independent penetration test, legal opinion, accessibility certification, or complete compliance audit. Users may scan only systems they own or are explicitly authorized to test.

## Contact
- Support: ${siteConfig.supportEmail}
- Security: ${siteConfig.securityEmail}
`;

  return new Response(content, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
