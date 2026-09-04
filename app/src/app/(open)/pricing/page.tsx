import type { Metadata } from "next";
import PricingPageView from "@/modules/pricing/view/PricingPageView";

export const metadata: Metadata = {
  title: "Pricing for Website Audits",
  description:
    "Start with a free security scan. Upgrade to Starter, Pro, or Business when you need continuous monitoring, evidence-backed findings, and client-ready reports. Cancel anytime.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Scanlyst Pricing for Website Audits",
    description:
      "Compare Scanlyst plans for website security, SEO, performance, accessibility, and continuous monitoring.",
    url: "/pricing",
    images: [
      {
        url: "/scanlyst-pricing-preview.webp",
        width: 1569,
        height: 900,
        alt: "Scanlyst pricing plans",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/scanlyst-pricing-preview.webp"],
  },
};

export default function PricingPage() {
  return <PricingPageView />;
}
