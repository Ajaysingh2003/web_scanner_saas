import type { Metadata } from "next";

import CheckoutResult from "@/modules/billing/component/CheckoutResult";

export const metadata: Metadata = {
  title: "Checkout Cancelled",
  robots: { index: false, follow: false },
};

export default function BillingCancelPage() {
  return <CheckoutResult outcome="cancelled" />;
}
