import type { Metadata } from "next";
import LegalPage from "@/modules/legal/LegalPage";
import { disclosureSections, LEGAL_UPDATED } from "@/modules/legal/legal-content";

export const metadata: Metadata = { title: "Responsible Disclosure", description: "How security researchers can responsibly report vulnerabilities affecting Scanlyst.", alternates: { canonical: "/responsible-disclosure" } };

export default function ResponsibleDisclosurePage() {
  return <LegalPage eyebrow="Security" title="Responsible Disclosure" description="Guidance for reporting a potential vulnerability in Scanlyst safely and constructively." updated={LEGAL_UPDATED} sections={disclosureSections} />;
}
