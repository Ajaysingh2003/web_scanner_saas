import type { Metadata } from "next";
import LegalPage from "@/modules/legal/LegalPage";
import { cookieSections, LEGAL_UPDATED } from "@/modules/legal/legal-content";

export const metadata: Metadata = { title: "Cookie Policy", description: "How Scanlyst uses essential cookies and browser storage for authentication, security, and preferences.", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return <LegalPage eyebrow="Legal" title="Cookie Policy" description="A clear explanation of the cookies and browser storage used to operate and secure Scanlyst." updated={LEGAL_UPDATED} sections={cookieSections} />;
}
