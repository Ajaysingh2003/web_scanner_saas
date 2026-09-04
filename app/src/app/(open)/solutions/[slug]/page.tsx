import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllSolutionSlugs, getSolutionBySlug } from "@/modules/solutions/data/solutions";
import SolutionDetailView from "@/modules/solutions/view/SolutionDetailView";
import StructuredData from "@/components/seo/StructuredData";
import { absoluteUrl } from "@/lib/site-config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSolutionSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolutionBySlug(slug);

  if (!solution) {
    return { title: "Solution Not Found" };
  }

  return {
    title: solution.title,
    description: solution.description,
    alternates: { canonical: `/solutions/${solution.slug}` },
    openGraph: { title: `${solution.title} | Scanlyst`, description: solution.description, url: `/solutions/${solution.slug}`, type: "article" },
  };
}

export default async function SolutionSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const solution = getSolutionBySlug(slug);

  if (!solution) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${absoluteUrl(`/solutions/${solution.slug}`)}#webpage`, url: absoluteUrl(`/solutions/${solution.slug}`), name: solution.title, description: solution.description, isPartOf: { "@id": `${absoluteUrl("/")}#website` } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Solutions", item: absoluteUrl("/solutions") },
        { "@type": "ListItem", position: 3, name: solution.title, item: absoluteUrl(`/solutions/${solution.slug}`) },
      ] },
      { "@type": "Service", serviceType: "Website audit platform", name: solution.title, description: solution.description, provider: { "@id": `${absoluteUrl("/")}#organization` }, areaServed: "Worldwide", url: absoluteUrl(`/solutions/${solution.slug}`) },
    ],
  };

  return <><StructuredData data={structuredData} /><SolutionDetailView solution={solution} /></>;
}
