export const siteConfig = {
  name: "Scanlyst",
  shortName: "Scanlyst",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://scanlyst.dev",
  title: "Scanlyst — Website Security, SEO, Performance & Accessibility Audits",
  description: "Scanlyst audits websites for security vulnerabilities, technical SEO, AI search readiness, Core Web Vitals, accessibility, compliance, and infrastructure risks—with prioritized remediation guidance.",
  supportEmail: "support@scanlyst.dev",
  securityEmail: "security@scanlyst.dev",
  socialImage: "/scanlyst-og-default.png",
  twitterImage: "/scanlyst-twitter-card.png",
  logoImage: "/scanlyst-logo-512.png",
} as const;

export const absoluteUrl = (path = "/") => new URL(path, siteConfig.url).toString();
