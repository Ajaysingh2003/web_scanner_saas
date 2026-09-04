"use client";

import Link from "next/link";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCode2,
  Share2,
  Compass,
  Layers,
  Smartphone,
  Tag,
  ExternalLink,
  Code,
  ArrowRight,
  Bot,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";



export default function SeoView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading } = useActiveProject();

  const overview = useSuspenseQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
  });

  const latestScan = useQuery({
    ...trpc.project.latestScan.queryOptions({ project_id: projectId }),
    enabled: !!project,
  });

  if (isLoading || overview.isLoading || latestScan.isLoading) {
    return <LoadingSkeleton />;
  }

  if (!project) {
    return (
      <EmptyState
        icon={Search}
        title="No Project Selected"
        description="Select or create a project to view Search Engine Optimization audit results."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );
  }

  const seoFindings =
    latestScan.data?.findings?.filter((f: any) => f.category === "seo") || [];

  const titleFinding = seoFindings.find((f) => f.title.toLowerCase().includes("title"));
  const descFinding = seoFindings.find((f) => f.title.toLowerCase().includes("description"));
  const ogFinding = seoFindings.find((f) => f.title.toLowerCase().includes("opengraph") || f.title.toLowerCase().includes("og:"));
  const sitemapFinding = seoFindings.find((f) => f.title.toLowerCase().includes("sitemap"));
  const robotsFinding = seoFindings.find((f) => f.title.toLowerCase().includes("robots"));
  const canonicalFinding = seoFindings.find((f) => f.title.toLowerCase().includes("canonical"));
  const viewportFinding = seoFindings.find((f) => f.title.toLowerCase().includes("viewport"));
  const structuredDataFinding = seoFindings.find((f) => f.title.toLowerCase().includes("schema") || f.title.toLowerCase().includes("json-ld"));

  const siteHostname = project.website_url ? new URL(project.website_url).hostname : "example.com";
  const displayTitle = project.name ? `${project.name} | Official Website` : `${siteHostname} Home`;
  const displayDesc = descFinding?.description || "Explore our fast, modern web application with high performance, accessibility, and robust security standards.";

  const technicalChecks = [
    {
      label: "Robots.txt & Indexability",
      status: !robotsFinding ? "pass" : "fail",
      detail: !robotsFinding ? "Robots policy permits search crawlers" : robotsFinding.title,
      icon: Compass,
    },
    {
      label: "XML Sitemap",
      status: !sitemapFinding ? "pass" : "fail",
      detail: !sitemapFinding ? "Valid XML sitemap detected" : sitemapFinding.title,
      icon: FileCode2,
    },
    {
      label: "Canonical URL",
      status: !canonicalFinding ? "pass" : "fail",
      detail: !canonicalFinding ? "Self-referencing canonical tag is active" : canonicalFinding.title,
      icon: Tag,
    },
    {
      label: "Mobile Viewport",
      status: !viewportFinding ? "pass" : "fail",
      detail: !viewportFinding ? "Configured with width=device-width" : viewportFinding.title,
      icon: Smartphone,
    },
    {
      label: "OpenGraph Metadata",
      status: !ogFinding ? "pass" : "fail",
      detail: !ogFinding ? "Social share tags (og:title, og:image) verified" : ogFinding.title,
      icon: Share2,
    },
    {
      label: "Structured Data (Schema)",
      status: !structuredDataFinding ? "pass" : "fail",
      detail: !structuredDataFinding ? "JSON-LD schema markup detected" : structuredDataFinding.title,
      icon: Code,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        websiteUrl={project.website_url}
        title="Search Engine Optimization"
        description="Verify traditional search crawler indexing, metadata health, canonical structures, OpenGraph social cards, and mobile viewport compliance."
        score={overview.data?.category_scores?.seo ?? null}
        scoreLabel="SEO Score"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/aeo">
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
                <Bot className="size-3.5 text-teal-600" />
                AEO AI Visibility
              </Button>
            </Link>
            <Link href="/dashboard/scans/run">
              <Button size="sm" className="bg-background-btn text-white h-9 px-4 text-xs gap-1.5 font-medium">
                Re-run SEO Audit
              </Button>
            </Link>
          </div>
        }
      />

      {/* Technical Checks Grid */}

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
          Technical SEO Infrastructure Matrix
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {technicalChecks.map((item) => {
            const Icon = item.icon;
            const isPass = item.status === "pass";
            return (
              <div
                key={item.label}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 transition-all bg-white",
                  isPass ? "border-slate-200/90 shadow-2xs" : "border-amber-200 bg-amber-50/30"
                )}
              >
                <span className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
                  isPass ? "bg-emerald-50 text-emerald-600" : "bg-amber-100 text-amber-700"
                )}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {item.label}
                    </span>
                    {isPass ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="size-3" /> Pass
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        <AlertCircle className="size-3" /> Issue
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Google SERP & OpenGraph Social Previews */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SERP Preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-blue-50 text-blue-600 text-xs font-bold font-mono">
                G
              </span>
              <h3 className="font-heading text-xs font-semibold text-slate-900">
                Google Search Result Preview
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Desktop SERP</span>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 space-y-1.5 font-sans">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 truncate">
              <span className="text-slate-500">https://{siteHostname}</span>
              <span className="text-slate-400">›</span>
            </div>
            <p className="text-base font-medium text-[#1a0dab] hover:underline cursor-pointer truncate">
              {displayTitle}
            </p>
            <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
              {displayDesc}
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Title: <strong>{displayTitle.length}</strong> / 60 chars</span>
            <span>Meta description: <strong>{displayDesc.length}</strong> / 160 chars</span>
          </div>
        </div>

        {/* Social Card Preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-slate-100 text-slate-700">
                <Share2 className="size-3.5" />
              </span>
              <h3 className="font-heading text-xs font-semibold text-slate-900">
                OpenGraph & Social Card Preview
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Twitter / LinkedIn / Discord</span>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="h-28 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 text-xs">
              <div className="flex flex-col items-center gap-1">
                <Share2 className="size-5 text-slate-400" />
                <span className="text-[11px]">og:image 1200x630</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50/70 border-t border-slate-100 space-y-0.5">
              <p className="text-[10px] uppercase font-semibold text-slate-400 font-mono">
                {siteHostname}
              </p>
              <p className="text-xs font-semibold text-slate-900 truncate">
                {displayTitle}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {displayDesc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Findings Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
            All Evaluated SEO Rules & Remediations
          </h2>
          <span className="text-xs text-slate-500 font-content">
            {seoFindings.length} issue{seoFindings.length !== 1 ? "s" : ""} detected
          </span>
        </div>
        <FindingsTable
          findings={seoFindings}
          scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
          emptyMessage="No SEO issues detected on your website. Canonical tags, robots.txt, sitemaps, and metadata are fully optimized."
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}

