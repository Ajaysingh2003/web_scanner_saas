import React from "react";
import { Metadata } from "next";
import SolutionsIndexView from "@/modules/solutions/view/SolutionsIndexView";

export const metadata: Metadata = {
  title: "Website Audit Solutions",
  description:
    "Purpose-built website audit solutions for vulnerability defense, AI answer engine optimization (AEO), Core Web Vitals speed, and universal WCAG 2.1 accessibility compliance.",
  alternates: { canonical: "/solutions" },
  openGraph: { title: "Scanlyst Website Audit Solutions", description: "Security, SEO and AEO, performance, and accessibility audit workflows for modern websites.", url: "/solutions" },
};

export default function SolutionsPage() {
  return <SolutionsIndexView />;
}
