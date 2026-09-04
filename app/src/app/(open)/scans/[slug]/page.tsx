import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllScannerSlugs, getScannerBySlug } from "@/modules/product/data/scanners";
import ScanDetailView from "@/modules/product/view/ScanDetailView";
import StructuredData from "@/components/seo/StructuredData";
import { absoluteUrl } from "@/lib/site-config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllScannerSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const scanner = getScannerBySlug(slug);
  if (!scanner) {
    return { title: "Scan Not Found — Scanlyst" };
  }

  return {
    title: scanner.title,
    description: scanner.description,
    alternates: { canonical: `/scans/${scanner.id}` },
    openGraph: { title: `${scanner.title} | Scanlyst`, description: scanner.description, url: `/scans/${scanner.id}`, type: "article" },
  };
}

export default async function ScanDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const scanner = getScannerBySlug(slug);

  if (!scanner) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${absoluteUrl(`/scans/${scanner.id}`)}#webpage`, url: absoluteUrl(`/scans/${scanner.id}`), name: scanner.title, description: scanner.description, isPartOf: { "@id": `${absoluteUrl("/")}#website` } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Scanners", item: absoluteUrl("/scans") },
        { "@type": "ListItem", position: 3, name: scanner.title, item: absoluteUrl(`/scans/${scanner.id}`) },
      ] },
      { "@type": "Service", serviceType: scanner.title, name: scanner.title, description: scanner.description, provider: { "@id": `${absoluteUrl("/")}#organization` }, areaServed: "Worldwide", url: absoluteUrl(`/scans/${scanner.id}`) },
    ],
  };

  return <><StructuredData data={structuredData} /><ScanDetailView scanner={scanner} /></>;
}
