import { SolutionItem, SolutionCategorySlug } from "../types";

export const SOLUTIONS_DATA: SolutionItem[] = [
  /* =========================================================================
     1. SECURITY AUDITS (/solutions/security)
     ========================================================================= */
  {
    id: "security",
    slug: "security",
    title: "Security Audits",
    navTitle: "Security Audits",
    navDesc: "SQLi, XSS, headers & auth protection",
    badge: "ENTERPRISE DEFENSE LAYER",
    headline: "Continuous Vulnerability Detection & Attack Surface Defense",
    description:
      "Automated deep-inspection across critical web vulnerability vectors, cloud database permissions, and transport encryption before malicious actors can exploit them.",
    longOverview:
      "Scanlyst provides automated, non-destructive external security testing for modern web applications. Every audit evaluates attacker-visible signals including database input barriers, client-side script contexts, Supabase Row-Level Security (RLS) enforcement, and TLS configuration, then returns evidence for human review.",
    accentColor: "text-rose-600",
    keyMetrics: [
      {
        label: "AUTOMATED PROBES",
        value: "220+",
        subtext: "Continuous attack vectors checked per run",
      },
      {
        label: "FALSE POSITIVE SLA",
        value: "0.0%",
        subtext: "Zero-noise reproduction proof generated",
      },
      {
        label: "DETECTION LATENCY",
        value: "<45s",
        subtext: "Average end-to-end audit execution time",
      },
      {
        label: "FRAMEWORK COMPLIANCE",
        value: "OWASP",
        subtext: "Mapped to Top 10 & CWE 25 standards",
      },
    ],
    checksHeading: "What We Audit In Your Security Perimeter",
    checksDescription:
      "Every security audit deploys non-destructive payloads to identify systemic vulnerabilities and produce actionable Git patch diffs.",
    checks: [
      {
        id: "sec-sqli",
        title: "SQL Injection & Database Isolation",
        description:
          "Probes query parameters, JSON request bodies, and form inputs for error-based, boolean blind, and time-delay extraction vectors.",
        severityOrImpact: "CRITICAL",
        scanSlug: "sqli",
        tag: "OWASP A03",
      },
      {
        id: "sec-xss",
        title: "Cross-Site Scripting (XSS) Mitigation",
        description:
          "Audits DOM sinks, unescaped template variables, and reflected inputs for stored or reflected script execution.",
        severityOrImpact: "HIGH",
        scanSlug: "xss",
        tag: "Client-Side",
      },
      {
        id: "sec-supabase",
        title: "BaaS & Supabase RLS Enforcement",
        description:
          "Inspects public REST/GraphQL endpoints for tables lacking Row-Level Security, public anon keys with elevated roles, and schema exposure.",
        severityOrImpact: "CRITICAL",
        scanSlug: "supabase-security",
        tag: "Cloud Backend",
      },
      {
        id: "sec-apikeys",
        title: "Hardcoded API Key & Secret Exposure",
        description:
          "Deep-parses bundled JavaScript chunks and environment dumps for exposed OpenAI, Stripe, AWS, and database credentials.",
        severityOrImpact: "CRITICAL",
        scanSlug: "api-keys",
        tag: "Data Privacy",
      },
      {
        id: "sec-idor",
        title: "IDOR & Authorization Flaws",
        description:
          "Validates object-level permission barriers, sequential resource identifiers, and tenant isolation across API endpoints.",
        severityOrImpact: "HIGH",
        scanSlug: "idor",
        tag: "OWASP A01",
      },
      {
        id: "sec-headers",
        title: "Strict Security Headers & CSP",
        description:
          "Verifies Content-Security-Policy (CSP), HSTS preloading, X-Frame-Options clickjacking defense, and Referrer-Policy configurations.",
        severityOrImpact: "MEDIUM",
        scanSlug: "security-headers",
        tag: "Configuration",
      },
      {
        id: "sec-ssltls",
        title: "SSL/TLS Cryptographic Grading",
        description:
          "Audits certificate expiration, intermediate chain trust, weak cipher suites (CBC, RC4), and Forward Secrecy enforcement.",
        severityOrImpact: "HIGH",
        scanSlug: "ssl-tls",
        tag: "Cryptography",
      },
      {
        id: "sec-cors",
        title: "CORS & Origin Validation",
        description:
          "Tests for wildcard Access-Control-Allow-Origin, null-origin reflection, and credential-leaking cross-origin policies.",
        severityOrImpact: "MEDIUM",
        scanSlug: "cors-misconfig",
        tag: "Network",
      },
    ],
    visualSnippet: {
      type: "security-dossier",
      title: "Attack Surface Telemetry",
      badge: "LIVE DEFENSE MATRIX",
      description: "Automated probe execution running against production endpoints with zero downtime impact.",
      metrics: [
        { label: "Vulnerability Score", value: "98/100", status: "good" },
        { label: "Active Attack Vectors", value: "0 Detected", status: "highlight" },
        { label: "TLS Grade", value: "A+ (TLS 1.3)", status: "good" },
        { label: "RLS Coverage", value: "100% Enforced", status: "good" },
      ],
    },
    standardsHeading: "Engineered for Global Regulatory Compliance",
    standardsDescription:
      "Scanlyst security reports map relevant findings to recognized security frameworks, helping teams prepare evidence for independent review.",
    standards: [
      {
        code: "OWASP-2021",
        name: "OWASP Top 10 Web Application Risks",
        description: "Full test coverage across A01 (Broken Access Control) through A10 (SSRF) attack vectors.",
        complianceLevel: "100% Automated Mapping",
      },
      {
        code: "NIST-800-53",
        name: "NIST Security & Privacy Controls",
        description: "Meets technical control specifications for continuous boundary and application vulnerability monitoring.",
        complianceLevel: "Federal Standard",
      },
      {
        code: "SOC2-CC6",
        name: "SOC 2 Type II (Common Criteria)",
        description: "Provides verifiable evidence of perimeter testing and access restriction for third-party audits.",
        complianceLevel: "Audit Ready",
      },
      {
        code: "CWE-TOP-25",
        name: "Common Weakness Enumeration",
        description: "Structured categorization of software flaws to pinpoint root vulnerabilities in development backlogs.",
        complianceLevel: "Industry Standard",
      },
    ],
    ctaTitle: "Eliminate Critical Vulnerabilities Before Production",
    ctaDescription:
      "Run an automated security audit on your public URL in seconds. No agent installation, credentials, or setup required.",
  },

  /* =========================================================================
     2. SEO & AEO (/solutions/seo-aeo)
     ========================================================================= */
  {
    id: "seo-aeo",
    slug: "seo-aeo",
    title: "SEO & AEO Audits",
    navTitle: "SEO & AEO",
    navDesc: "Search engine & AI crawler readiness",
    badge: "AI-ERA DISCOVERY & CITATION",
    headline: "Dominate Google Rankings & Generative AI Search Discovery",
    description:
      "Ensure your website is optimized for traditional search crawlers and primed for ingestion and citation by ChatGPT, Perplexity, Claude, and Google AI Overviews.",
    longOverview:
      "Search discovery now includes semantic retrieval and AI-generated answers alongside traditional indexing. Scanlyst evaluates structured data, crawl hierarchy, semantic headings, and AI crawler accessibility to improve how clearly machines can understand and cite your public content.",
    accentColor: "text-rose-600",
    keyMetrics: [
      {
        label: "AEO ENGINE READINESS",
        value: "99.4%",
        subtext: "Parsed cleanly by LLM context scrapers",
      },
      {
        label: "SCHEMA GRAPH AUDITS",
        value: "100%",
        subtext: "Validated against Schema.org 24.0",
      },
      {
        label: "INDEXING COVERAGE",
        value: "0 Errors",
        subtext: "Robots, canonicals & sitemap alignment",
      },
      {
        label: "ANSWER CITABILITY",
        value: "High",
        subtext: "Optimized for Perplexity & Claude citations",
      },
    ],
    checksHeading: "What We Audit In Your Search & Discovery Architecture",
    checksDescription:
      "Comprehensive validation of traditional search engine factors alongside cutting-edge Answer Engine Optimization (AEO) protocols.",
    checks: [
      {
        id: "seo-aeo-readiness",
        title: "AEO & LLM Citation Readiness",
        description:
          "Verifies content chunk readability, factual density, and semantic entity clarity for ChatGPT-Search, Perplexity, and Claude scrapers.",
        severityOrImpact: "CRITICAL",
        scanSlug: "aeo-ai-readiness",
        tag: "Generative Search",
      },
      {
        id: "seo-tech-crawling",
        title: "Technical SEO & Crawl Budget Hierarchy",
        description:
          "Audits canonical links, redirection chains, indexing directives (noindex/nofollow), and XML sitemap synchronization.",
        severityOrImpact: "HIGH",
        scanSlug: "technical-seo",
        tag: "Googlebot",
      },
      {
        id: "seo-schema-jsonld",
        title: "JSON-LD Structured Data & Entity Graphs",
        description:
          "Validates Organization, Product, Article, and FAQ schema against strict Schema.org standards to power rich snippets in search results.",
        severityOrImpact: "HIGH",
        tag: "Structured Data",
      },
      {
        id: "seo-opengraph",
        title: "OpenGraph & Social Preview Integrity",
        description:
          "Checks og:title, og:image dimensions, Twitter Cards, and fallback meta tags to ensure viral previews render impeccably across social platforms.",
        severityOrImpact: "MEDIUM",
        tag: "Social Sharing",
      },
      {
        id: "seo-heading-tree",
        title: "Semantic Heading Taxonomy (H1–H6)",
        description:
          "Ensures logical outline hierarchy with exactly one primary H1, zero skipped heading levels, and keyword-aligned section titles.",
        severityOrImpact: "MEDIUM",
        tag: "Semantics",
      },
      {
        id: "seo-robots-directives",
        title: "Robots.txt & AI Bot Crawler Policies",
        description:
          "Inspects user-agent disallows for Googlebot, Bingbot, GPTBot, ClaudeBot, and PerplexityBot to prevent accidental traffic blackouts.",
        severityOrImpact: "HIGH",
        tag: "Crawler Access",
      },
    ],
    visualSnippet: {
      type: "aeo-crawler",
      title: "AI Answer Engine Extraction Simulator",
      badge: "LLM INGESTION STREAM",
      description: "Simulating entity resolution and citation generation across Claude and Perplexity agents.",
      metrics: [
        { label: "Entity Extraction Rate", value: "98.7%", status: "good" },
        { label: "Citation Confidence", value: "Strong", status: "highlight" },
        { label: "Semantic Density", value: "Optimal", status: "good" },
        { label: "Crawl Blockers", value: "0 Detected", status: "good" },
      ],
    },
    standardsHeading: "Aligned with Modern Search & Web Semantics",
    standardsDescription:
      "Engineered in lockstep with official search engine webmaster guidelines and open-source semantic web specifications.",
    standards: [
      {
        code: "GOOGLE-SEARCH",
        name: "Google Search Essentials",
        description: "Strict adherence to indexing, crawlability, and algorithmic spam avoidance policies.",
        complianceLevel: "Official Spec",
      },
      {
        code: "SCHEMA-ORG",
        name: "Schema.org v24.0 Microdata",
        description: "Universal structured vocabulary for search engines and generative AI agents.",
        complianceLevel: "Global Standard",
      },
      {
        code: "OPENAI-GEO",
        name: "AI Engine Crawler Directives",
        description: "Standards-compliant handling of GPTBot, OAI-SearchBot, and AI attribution headers.",
        complianceLevel: "Next-Gen Spec",
      },
      {
        code: "W3C-SEMANTICS",
        name: "W3C HTML5 Semantic Specification",
        description: "Ensures programmatic document hierarchy for high accessibility and crawler comprehension.",
        complianceLevel: "W3C Standard",
      },
    ],
    ctaTitle: "Capture High-Intent Traffic from Google & AI Engines",
    ctaDescription:
      "Audit your domain for technical SEO bottlenecks and Generative Engine Optimization readiness in one seamless scan.",
  },

  /* =========================================================================
     3. PERFORMANCE (/solutions/performance)
     ========================================================================= */
  {
    id: "performance",
    slug: "performance",
    title: "Performance Audits",
    navTitle: "Performance",
    navDesc: "Core Web Vitals & speed benchmarks",
    badge: "CONVERSION VELOCITY",
    headline: "Sub-Second Load Times & Flawless Core Web Vitals",
    description:
      "Diagnose client-side rendering bottlenecks, main-thread blocking JavaScript, and layout instability to boost conversion rates and user retention.",
    longOverview:
      "Website responsiveness can materially affect user experience and conversion. Scanlyst evaluates Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS), helping teams identify assets, scripts, and server latency that deserve attention.",
    accentColor: "text-rose-600",
    keyMetrics: [
      {
        label: "LARGEST CONTENTFUL PAINT",
        value: "<1.2s",
        subtext: "Well below the 2.5s good threshold",
      },
      {
        label: "INTERACTION TO NEXT PAINT",
        value: "<80ms",
        subtext: "Immediate UI response on tap/click",
      },
      {
        label: "CUMULATIVE LAYOUT SHIFT",
        value: "0.00",
        subtext: "Zero disruptive visual movement",
      },
      {
        label: "TIME TO FIRST BYTE (TTFB)",
        value: "<120ms",
        subtext: "Global edge CDN response benchmark",
      },
    ],
    checksHeading: "What We Audit In Your Performance Pipeline",
    checksDescription:
      "Microsecond-level performance profiling across synthetic 4G/5G mobile throttles and desktop viewport environments.",
    checks: [
      {
        id: "perf-cwv",
        title: "Core Web Vitals Metric Suite",
        description:
          "Comprehensive field and lab measurements for LCP, INP, CLS, FCP (First Contentful Paint), and TTFB.",
        severityOrImpact: "CRITICAL",
        scanSlug: "core-web-vitals",
        tag: "Core Web Vitals",
      },
      {
        id: "perf-mainthread",
        title: "Main-Thread Execution & Long Tasks",
        description:
          "Identifies heavy JavaScript evaluation tasks exceeding 50ms that freeze user interactions and degrade INP.",
        severityOrImpact: "HIGH",
        tag: "JavaScript",
      },
      {
        id: "perf-assets",
        title: "Asset Optimization & Modern Formats",
        description:
          "Audits images for next-generation AVIF/WebP compression, missing explicit width/height tags, and eager offscreen loading.",
        severityOrImpact: "MEDIUM",
        tag: "Media Optimization",
      },
      {
        id: "perf-caching",
        title: "Edge Cache-Control & Compression",
        description:
          "Verifies Brotli/Gzip text compression and immutable cache-control headers on static CSS, JS, and font assets.",
        severityOrImpact: "HIGH",
        tag: "Infrastructure",
      },
      {
        id: "perf-fonts",
        title: "Web Font Loading & Layout Shifts",
        description:
          "Checks font-display: swap behavior, self-hosted WOFF2 assets, and preconnect hints to avoid FOIT and FOUT shifts.",
        severityOrImpact: "MEDIUM",
        tag: "Typography",
      },
      {
        id: "perf-bundle",
        title: "Bundle Bloat & Tree-Shaking Efficiency",
        description:
          "Discovers oversized third-party vendor bundles, duplicate package versions, and non-critical CSS blocking rendering.",
        severityOrImpact: "MEDIUM",
        tag: "Code Splitting",
      },
    ],
    visualSnippet: {
      type: "vitals-waterfall",
      title: "Core Web Vitals Velocity Report",
      badge: "SYNTHETIC PROFILE",
      description: "Throttled mobile audit matching Google Lighthouse & CrUX real-world testing environments.",
      metrics: [
        { label: "Performance Score", value: "99/100", status: "good" },
        { label: "LCP Benchmark", value: "0.94s", status: "highlight" },
        { label: "INP Latency", value: "48ms", status: "good" },
        { label: "Total Page Weight", value: "412 KB", status: "good" },
      ],
    },
    standardsHeading: "Built on Global Web Performance Standards",
    standardsDescription:
      "Benchmarked using methodologies defined by the W3C Web Performance Working Group and the Chrome UX Report.",
    standards: [
      {
        code: "CRUX-METRICS",
        name: "Chrome UX Report (CrUX)",
        description: "Official Google data source for 75th-percentile real-world user experience benchmarks.",
        complianceLevel: "Gold Standard",
      },
      {
        code: "W3C-PERF",
        name: "W3C Performance Timeline API",
        description: "Standardized browser metrics API for accurate high-resolution performance monitoring.",
        complianceLevel: "W3C Spec",
      },
      {
        code: "LIGHTHOUSE-V12",
        name: "Google Lighthouse v12 Engine",
        description: "Calibrated lab auditing engine measuring performance under reproducible simulated conditions.",
        complianceLevel: "Industry Benchmark",
      },
      {
        code: "HTTP3-QUIC",
        name: "HTTP/3 & QUIC Protocol Verification",
        description: "Zero-RTT connection handshaking for reduced packet loss latency on cellular connections.",
        complianceLevel: "Network Standard",
      },
    ],
    ctaTitle: "Accelerate Your Web Application To Sub-Second Speed",
    ctaDescription:
      "Pinpoint render-blocking scripts, unoptimized assets, and layout shifts in seconds with our automated performance scanner.",
  },

  /* =========================================================================
     4. ACCESSIBILITY (/solutions/accessibility)
     ========================================================================= */
  {
    id: "accessibility",
    slug: "accessibility",
    title: "Accessibility Audits",
    navTitle: "Accessibility",
    navDesc: "WCAG 2.1 AA/AAA compliance checks",
    badge: "INCLUSIVE DIGITAL PERFECTION",
    headline: "Universal Accessibility & Ironclad WCAG Compliance",
    description:
      "Ensure every customer can navigate your digital experience seamlessly while safeguarding your business against ADA Title III and European Accessibility Act (EAA) liability.",
    longOverview:
      "Digital accessibility supports inclusive experiences and can be a legal requirement. Scanlyst checks the accessibility tree against automated WCAG-oriented rules, including color contrast, keyboard focus, screen-reader announcements, and form labeling. Automated checks complement, but do not replace, manual accessibility testing.",
    accentColor: "text-rose-600",
    keyMetrics: [
      {
        label: "WCAG 2.1 AA COVERAGE",
        value: "100%",
        subtext: "Complete automated rule compliance",
      },
      {
        label: "COLOR CONTRAST CHECKS",
        value: "4.5:1+",
        subtext: "Strict minimum luminance validation",
      },
      {
        label: "KEYBOARD ACCESSIBILITY",
        value: "Full",
        subtext: "Zero trapped focus cycles or invisible states",
      },
      {
        label: "LEGAL SHIELD",
        value: "ADA / EAA",
        subtext: "Aligned with US & European regulations",
      },
    ],
    checksHeading: "What We Audit In Your Accessibility Surface",
    checksDescription:
      "Automated DOM and computed style inspection checking every interactive element, text contrast ratio, and ARIA hierarchy.",
    checks: [
      {
        id: "a11y-wcag-suite",
        title: "WCAG 2.1 Level AA/AAA Validation",
        description:
          "Comprehensive evaluation of perceivability, operability, understandability, and robustness across your DOM tree.",
        severityOrImpact: "CRITICAL",
        scanSlug: "accessibility-wcag",
        tag: "WCAG Compliance",
      },
      {
        id: "a11y-contrast",
        title: "Color Contrast & Visual Luminance",
        description:
          "Calculates exact contrast ratios between foreground text and underlying backgrounds (4.5:1 for normal text, 3:1 for large text).",
        severityOrImpact: "HIGH",
        tag: "Visual Design",
      },
      {
        id: "a11y-keyboard",
        title: "Full Keyboard Operability & Focus Rings",
        description:
          "Tests logical tab index sequencing, visible focus indicator styles, and ensures no focus traps prevent keyboard-only navigation.",
        severityOrImpact: "CRITICAL",
        tag: "Keyboard Navigation",
      },
      {
        id: "a11y-aria",
        title: "ARIA Roles & Semantic Landmarks",
        description:
          "Audits custom UI components for proper role, aria-expanded, aria-controls, and landmark regions (main, nav, banner).",
        severityOrImpact: "HIGH",
        tag: "Screen Readers",
      },
      {
        id: "a11y-forms",
        title: "Form Inputs & Real-Time Error Messaging",
        description:
          "Verifies every form control has an explicitly associated <label>, aria-describedby for errors, and autocomplete attributes.",
        severityOrImpact: "HIGH",
        tag: "Form Usability",
      },
      {
        id: "a11y-alt-text",
        title: "Alternative Text & Decorative Image Bypass",
        description:
          "Ensures all informative images have meaningful descriptive alt text while purely decorative icons use aria-hidden='true'.",
        severityOrImpact: "MEDIUM",
        tag: "Media Accessibility",
      },
    ],
    visualSnippet: {
      type: "accessibility-auditor",
      title: "Screen Reader & Contrast Dossier",
      badge: "COMPLIANCE VERIFICATION",
      description: "Automated accessibility tree validation verifying compliance with international accessibility laws.",
      metrics: [
        { label: "WCAG 2.1 AA Score", value: "100%", status: "good" },
        { label: "Contrast Deficiencies", value: "0 Detected", status: "highlight" },
        { label: "Focus Ring Integrity", value: "Pass", status: "good" },
        { label: "Screen Reader Readiness", value: "Optimal", status: "good" },
      ],
    },
    standardsHeading: "Built for International Accessibility Law & Standards",
    standardsDescription:
      "Scanlyst reports provide documented automated findings that can support a broader accessibility review and remediation program.",
    standards: [
      {
        code: "WCAG-2.1-AA",
        name: "W3C Web Content Accessibility Guidelines",
        description: "The global de-facto technical benchmark for creating inclusive web software.",
        complianceLevel: "AA & AAA Target",
      },
      {
        code: "ADA-TITLE-III",
        name: "Americans with Disabilities Act (ADA)",
        description: "Protects businesses against website accessibility lawsuits under Title III public accommodations.",
        complianceLevel: "US Legal Standard",
      },
      {
        code: "EAA-2025",
        name: "European Accessibility Act (EN 301 549)",
        description: "Mandatory EU standard requiring accessible ecommerce, banking, and digital services.",
        complianceLevel: "Mandatory EU Law",
      },
      {
        code: "SECTION-508",
        name: "US Rehabilitation Act Section 508",
        description: "Federal requirement ensuring electronic information is accessible to individuals with disabilities.",
        complianceLevel: "Federal Standard",
      },
    ],
    ctaTitle: "Ensure Your Website Is Inclusive & 100% Compliant",
    ctaDescription:
      "Detect color contrast errors, missing ARIA tags, and keyboard traps across your entire digital presence with zero friction.",
  },
];

export function getAllSolutions(): SolutionItem[] {
  return SOLUTIONS_DATA;
}

export function getSolutionBySlug(slug: string): SolutionItem | undefined {
  return SOLUTIONS_DATA.find((s) => s.slug === slug);
}

export function getAllSolutionSlugs(): string[] {
  return SOLUTIONS_DATA.map((s) => s.slug);
}
