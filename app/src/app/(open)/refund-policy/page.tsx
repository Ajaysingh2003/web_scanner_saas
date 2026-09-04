import type { Metadata } from "next";
import LegalPage from "@/modules/legal/LegalPage";
import { LEGAL_UPDATED, refundSections } from "@/modules/legal/legal-content";

export const metadata: Metadata = { title: "Refund Policy", description: "Scanlyst subscription cancellation, billing correction, and refund request policy.", alternates: { canonical: "/refund-policy" } };

export default function RefundPolicyPage() {
  return <LegalPage eyebrow="Billing" title="Refund Policy" description="How subscription cancellations, billing errors, plan changes, and eligible refund requests are handled." updated={LEGAL_UPDATED} sections={refundSections} />;
}
