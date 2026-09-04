import type { Metadata } from "next";

import CheckoutResult from "@/modules/billing/component/CheckoutResult";

export const metadata: Metadata = {
  title: "Payment Confirmation",
  robots: { index: false, follow: false },
};

export default function BillingSuccessPage() {
  return <CheckoutResult outcome="success" />;
}
