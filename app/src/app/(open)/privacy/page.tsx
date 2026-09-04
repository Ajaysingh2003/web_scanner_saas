import type { Metadata } from "next";
import LegalPage from "@/modules/legal/LegalPage";
import { LEGAL_UPDATED, privacySections } from "@/modules/legal/legal-content";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Scanlyst collects, uses, protects, and retains account, billing, and website security scan data.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" description="This policy explains what information Scanlyst processes, why we use it, and the choices available to you." updated={LEGAL_UPDATED} sections={privacySections} />;
}
