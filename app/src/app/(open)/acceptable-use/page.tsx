import type { Metadata } from "next";
import LegalPage from "@/modules/legal/LegalPage";
import { acceptableUseSections, LEGAL_UPDATED } from "@/modules/legal/legal-content";

export const metadata: Metadata = { title: "Acceptable Use Policy", description: "Rules for authorized, defensive, and responsible use of Scanlyst security scanning and monitoring.", alternates: { canonical: "/acceptable-use" } };

export default function AcceptableUsePage() {
  return <LegalPage eyebrow="Trust & safety" title="Acceptable Use Policy" description="Scanlyst is built for defensive security. This policy defines safe, authorized use and activities that are prohibited." updated={LEGAL_UPDATED} sections={acceptableUseSections} />;
}
