import React from "react";
import { Metadata } from "next";
import ProductView from "@/modules/product/view/ProductView";

export const metadata: Metadata = {
  title: "Website Security & Quality Scanners",
  description:
    "Explore all 41 scanners and 200+ automated security, SEO, and performance checks in Scanlyst. SQLi, XSS, exposed keys, BaaS misconfigs, SSL/TLS, Core Web Vitals, and AI-search readiness.",
  alternates: { canonical: "/scans" },
  openGraph: { title: "41 Website Security, SEO and Performance Scanners", description: "Explore the automated checks Scanlyst uses to uncover website vulnerabilities, technical SEO issues, performance regressions, and accessibility barriers.", url: "/scans" },
};

interface PageProps {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function ScansCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <ProductView
      initialCategory={params?.category}
      initialSearch={params?.search}
    />
  );
}
