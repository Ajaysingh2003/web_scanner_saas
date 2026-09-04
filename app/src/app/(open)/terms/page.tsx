import type { Metadata } from "next";
import LegalPage from "@/modules/legal/LegalPage";
import { LEGAL_UPDATED, termsSections } from "@/modules/legal/legal-content";

export const metadata: Metadata = { title: "Terms of Service", description: "Terms governing authorized use of Scanlyst website scanning, monitoring, reports, subscriptions, and APIs.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of Service" description="These terms define the rules for using Scanlyst responsibly, including the requirement to scan only systems you are authorized to test." updated={LEGAL_UPDATED} sections={termsSections} />;
}
