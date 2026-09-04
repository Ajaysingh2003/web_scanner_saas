export type SolutionCategorySlug = "security" | "seo-aeo" | "performance" | "accessibility";

export interface SolutionSubCheck {
  id: string;
  title: string;
  description: string;
  severityOrImpact: "CRITICAL" | "HIGH" | "MEDIUM" | "OPTIMAL";
  scanSlug?: string;
  tag: string;
}

export interface SolutionMetric {
  label: string;
  value: string;
  subtext: string;
}

export interface SolutionStandard {
  code: string;
  name: string;
  description: string;
  complianceLevel: string;
}

export interface SolutionVisualSnippet {
  type: "security-dossier" | "aeo-crawler" | "vitals-waterfall" | "accessibility-auditor";
  title: string;
  badge: string;
  description: string;
  metrics: {
    label: string;
    value: string;
    status: "good" | "neutral" | "highlight";
  }[];
}

export interface SolutionItem {
  id: SolutionCategorySlug;
  slug: string;
  title: string;
  navTitle: string;
  navDesc: string;
  badge: string;
  headline: string;
  description: string;
  longOverview: string;
  accentColor: string;
  keyMetrics: SolutionMetric[];
  checksHeading: string;
  checksDescription: string;
  checks: SolutionSubCheck[];
  visualSnippet: SolutionVisualSnippet;
  standardsHeading: string;
  standardsDescription: string;
  standards: SolutionStandard[];
  ctaTitle: string;
  ctaDescription: string;
}
