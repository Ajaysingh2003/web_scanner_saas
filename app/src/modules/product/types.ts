export type ScannerCategory =
  | "all"
  | "vulnerability"
  | "configuration"
  | "infrastructure"
  | "compliance"
  | "monitoring"
  | "performance"
  | "accessibility"
  | "seo_aeo";

export type ScannerSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface CodeDiffExample {
  title: string;
  language: string;
  bad: string;
  good: string;
  explanation: string;
}

export interface ScannerItem {
  id: string;
  title: string;
  category: Exclude<ScannerCategory, "all">;
  categoryLabel: string;
  description: string;
  detailedScope: string;
  severity: ScannerSeverity;
  cvss: string;
  checksCount: number;
  sampleVector: string;
  codeDiff?: CodeDiffExample;
  aiFixPrompt: string;
  tags: string[];
}

export interface CategoryTab {
  id: ScannerCategory;
  label: string;
  count: number;
}
