"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Layers,
  Shield,
  Search,
  Gauge,
  Globe,
  FileCheck2,
  Accessibility,
  Terminal,
  Bot,
  ArrowUpRight,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";
import FindingsTable, { getCategoryHref } from "@/modules/dashboard/component/FindingsTable";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";

const statusConfig = {
  queued: { label: "Queued", icon: Clock3, badge: "bg-slate-100 text-slate-600 border-slate-200" },
  running: { label: "Scanning", icon: RefreshCw, badge: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Completed", icon: CheckCircle2, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", icon: XCircle, badge: "bg-rose-50 text-rose-700 border-rose-200" },
} as const;

export default function ScanDetailView() {
  const trpc = useTRPC();
  const params = useParams<{ scanId: string }>();

  const scan = useQuery({
    ...trpc.project.scanDetail.queryOptions({ scan_id: params.scanId }),
    enabled: Boolean(params.scanId),
    refetchInterval: (query) =>
      ["queued", "running"].includes(query.state.data?.status || "") ? 2500 : false,
  });

  const overview = useQuery({
    ...trpc.project.overview.queryOptions({ project_id: scan.data?.project_id || "" }),
    enabled: Boolean(scan.data?.project_id),
  });

  if (scan.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (scan.isError || !scan.data) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 text-center">
        <XCircle className="mx-auto size-8 text-rose-500" />
        <h2 className="mt-2 font-heading text-lg font-semibold text-slate-900">Scan not found</h2>
        <p className="mt-1 font-content text-sm text-slate-500">
          {scan.error?.message || "Could not load details for this scan ID."}
        </p>
        <Link href="/dashboard/scans/history">
          <Button variant="outline" size="sm" className="mt-4">
            Back to Scan History
          </Button>
        </Link>
      </div>
    );
  }

  const result = scan.data;
  const statusInfo = statusConfig[result.status] || statusConfig.queued;
  const StatusIcon = statusInfo.icon;
  const scannerRuns = result.scanner_runs || [];
  const failedRuns = scannerRuns.filter((r) => r.status === "failed");

  const scoring = (result as any)?.metadata_?.scoring?.category_scores || (result as any)?.metadata?.scoring?.category_scores || overview.data?.category_scores || {};
  const catCounts = overview.data?.category_counts || {};


  const categoryCards = [
    {
      title: "Domain & Infrastructure",
      shortTitle: "Domain",
      href: "/dashboard/domain",
      icon: Globe,
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
      score: scoring.domain ?? scoring.infrastructure ?? null,
      issuesCount: catCounts.domain ?? result.findings.filter((f) => f.category === "infrastructure" || f.category === "domain").length,
      description: "DNS records, SPF, DKIM, DMARC email security, and TLS certificate chain.",
    },
    {
      title: "Search Engine Optimization",
      shortTitle: "SEO",
      href: "/dashboard/seo",
      icon: Search,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      score: scoring.seo ?? null,
      issuesCount: catCounts.seo ?? result.findings.filter((f) => f.category === "seo").length,
      description: "Metadata, OpenGraph preview, SERP snippet, canonicals, robots.txt, and sitemaps.",
    },
    {
      title: "Answer Engine Optimization",
      shortTitle: "AEO",
      href: "/dashboard/aeo",
      icon: Bot,
      bgColor: "bg-cyan-50",
      textColor: "text-cyan-600",
      score: scoring.aeo ?? null,
      issuesCount: catCounts.aeo ?? result.findings.filter((f) => f.category === "aeo").length,
      description: "LLM citation readiness, Schema.org entities, and direct answer optimizations.",
    },
    {
      title: "Performance & Core Web Vitals",
      shortTitle: "Performance",
      href: "/dashboard/performance",
      icon: Gauge,
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      score: scoring.performance ?? null,
      issuesCount: catCounts.performance ?? result.findings.filter((f) => f.category === "performance").length,
      description: "LCP, FID, CLS, INP, TTFB, and speed optimization opportunities.",
    },
    {
      title: "Security Posture & Headers",
      shortTitle: "Security Headers",
      href: "/dashboard/security/headers",
      icon: Shield,
      bgColor: "bg-rose-50",
      textColor: "text-rose-600",
      score: scoring.configuration ?? scoring.security ?? null,
      issuesCount: catCounts.configuration ?? result.findings.filter((f) => f.category === "configuration" || f.category === "security").length,
      description: "HTTP headers (CSP, HSTS, X-Frame-Options), SSL ciphers, and transport security.",
    },
    {
      title: "Application Vulnerabilities",
      shortTitle: "Vulnerabilities",
      href: "/dashboard/security/vulnerabilities",
      icon: Terminal,
      bgColor: "bg-red-50",
      textColor: "text-red-600",
      score: scoring.vulnerability ?? null,
      issuesCount: catCounts.vulnerability ?? result.findings.filter((f) => f.category === "vulnerability").length,
      description: "Active probe checks for XSS, SQLi, CSRF, and application risk remediations.",
    },
    {
      title: "Accessibility (WCAG 2.2)",
      shortTitle: "Accessibility",
      href: "/dashboard/accessibility",
      icon: Accessibility,
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
      score: scoring.accessibility ?? null,
      issuesCount: catCounts.accessibility ?? result.findings.filter((f) => f.category === "accessibility").length,
      description: "Color contrast, screen reader compatibility, keyboard navigation, and ARIA markup.",
    },
    {
      title: "Privacy & Compliance",
      shortTitle: "Compliance",
      href: "/dashboard/compliance",
      icon: FileCheck2,
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
      score: scoring.compliance ?? null,
      issuesCount: catCounts.compliance ?? result.findings.filter((f) => f.category === "compliance").length,
      description: "Cookie consent, privacy policy compliance, tracker integrity, and regulatory checks.",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/scans/history"
          className="inline-flex items-center gap-1.5 font-content text-xs text-slate-500 hover:text-[#f43f5e] transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to scan history
        </Link>
        <span className="text-xs text-slate-400 font-mono">ID: {result.id}</span>
      </div>

      <PageHeader
        websiteUrl={result.url}
        title={result.scan_type === "full" ? "Full Website Audit" : `${result.scan_type.replace(/_/g, " ")} scan`}
        description={`Audit executed on ${result.started_at ? new Date(result.started_at).toLocaleString() : "recently"}.`}
        score={result.overall_score}
        scoreLabel="Overall Score"
        actions={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusInfo.badge}`}
            >
              <StatusIcon className={`size-3.5 ${result.status === "running" ? "animate-spin" : ""}`} />
              {statusInfo.label}
            </span>
          </div>
        }
      />

      {failedRuns.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-amber-950 font-heading">
              Incomplete Audit: {failedRuns.length} scanner{failedRuns.length === 1 ? "" : "s"} could not connect to this target
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-amber-800 font-content">
              {((result as any)?.metadata_?.scoring?.global_score != null || (result as any)?.metadata?.scoring?.global_score != null) && (
                <span>
                  Findings-only quality score is{" "}
                  <strong>
                    {Math.round(
                      (result as any)?.metadata_?.scoring?.global_score ??
                      (result as any)?.metadata?.scoring?.global_score
                    )}/100
                  </strong>
                  , but the overall score is capped at <strong>{result.overall_score ?? 0}/100</strong> due to low audit coverage.{" "}
                </span>
              )}
              {failedRuns.length} security scanners timed out or were blocked by the target host or DNS. You can review individual scanner failure details in the audit sections below.
            </p>
          </div>
        </div>
      )}

      {/* Category Deep-Dive Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-slate-950">
            Audit Pillars & Deep-Dive Diagnostics
          </h2>
          <span className="text-xs text-slate-500 font-content">
            Select a category to inspect full diagnostics, live tools & fixes
          </span>
        </div>

       <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
  {categoryCards.map((cat) => {
    const Icon = cat.icon;
    const roundedScore = cat.score != null ? Math.round(cat.score) : null;

    const scorePillClass =
      roundedScore == null
        ? ""
        : roundedScore >= 90
          ? "border-emerald-200/80 bg-emerald-50 text-emerald-700"
          : roundedScore >= 70
            ? "border-amber-200/80 bg-amber-50 text-amber-700"
            : "border-rose-200/80 bg-rose-50 text-rose-700";

    const scoreDotClass =
      roundedScore == null
        ? ""
        : roundedScore >= 90
          ? "bg-emerald-500"
          : roundedScore >= 70
            ? "bg-amber-500"
            : "bg-rose-500";

    return (
      <Link
        key={cat.href}
        href={cat.href}
        className="group relative flex flex-col justify-between rounded-xl border border-slate-200/85 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xs"
      >
        <div>
          {/* Top Row: Icon + Score Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg border border-slate-150 bg-slate-50/80 text-slate-600 transition-colors group-hover:border-rose-200 group-hover:bg-rose-50/60 group-hover:text-rose-600">
              <Icon className="size-4" />
            </div>

            {roundedScore != null ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums shadow-2xs ${scorePillClass}`}
              >
                <span className={`size-1 rounded-full ${scoreDotClass}`} />
                <span>{roundedScore}</span>
                <span className="font-sans text-[10px] font-normal opacity-60">/100</span>
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-50 px-2 py-0.5 font-mono text-[10.5px] font-medium text-slate-600">
                {cat.issuesCount ?? 0} {cat.issuesCount === 1 ? "issue" : "issues"}
              </span>
            )}
          </div>

          {/* Title & Description */}
          <h3 className="font-heading mt-3.5 text-[13.5px] font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-slate-950">
            {cat.title}
          </h3>
          <p className="mt-1 font-content text-xs leading-relaxed text-slate-500 line-clamp-2">
            {cat.description}
          </p>
        </div>

        {/* Footer Link Row */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 font-mono text-[11px] font-medium text-slate-400 transition-colors group-hover:text-rose-600">
          <span>Inspect {cat.shortTitle}</span>
          <ArrowUpRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </Link>
    );
  })}
</div>
      </section>

      {/* Scanner Progress / Failure Alert */}
      {failedRuns.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-heading text-sm font-semibold text-rose-900">
                {failedRuns.length} Scanner{failedRuns.length > 1 ? "s" : ""} Encountered Errors
              </h3>
              <p className="font-content text-xs text-rose-700 leading-relaxed">
                Some scanners failed to complete analysis due to network timeouts, rate limiting, or target unreachability.
              </p>
              <ul className="mt-2 space-y-1 text-xs font-mono text-rose-800">
                {failedRuns.map((r, idx) => (
                  <li key={idx} className="bg-white/60 rounded px-2 py-1 border border-rose-200">
                    <strong>{r.scanner_name}</strong>: {r.error || "Unknown execution failure"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Scanners Execution Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-slate-950">
            Individual Scanner Execution ({scannerRuns.length})
          </h2>
          <span className="text-xs text-slate-500 font-content">
            {result.progress?.completed_scanners || 0}/{result.progress?.total_scanners || scannerRuns.length} scanners finished
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Scanner Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Execution Status</th>
                  <th className="px-5 py-3 text-right">Findings Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-content text-xs">
                {scannerRuns.length > 0 ? (
                  scannerRuns.map((run, idx) => {
                    const isCompleted = run.status === "completed";
                    const isRunning = run.status === "running";
                    const isFailed = run.status === "failed";
                    const catHref = getCategoryHref(run.category, run.scanner_name);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900 font-mono">
                          {run.scanner_name}
                        </td>
                        <td className="px-5 py-3 capitalize">
                          <Link
                            href={catHref}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            title={`Explore ${run.category} deep dive`}
                          >
                            <span>{run.category}</span>
                            <ArrowUpRight className="size-2.5 opacity-60" />
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="size-3.5" /> Completed
                            </span>
                          )}
                          {isRunning && (
                            <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                              <RefreshCw className="size-3.5 animate-spin" /> Scanning
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-medium" title={run.error || ""}>
                              <XCircle className="size-3.5" /> Failed
                            </span>
                          )}
                          {run.status === "queued" && (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                              <Clock3 className="size-3.5" /> Queued
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">
                          {run.findings_count > 0 ? (
                            <span className="text-[#f43f5e]">{run.findings_count} issue{run.findings_count !== 1 ? "s" : ""}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">0 issues</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-xs text-slate-500">
                      Scanner execution logs pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Discovered Findings Table */}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-slate-950">
            Detected Audit Findings
          </h2>
          <span className="text-xs text-slate-500 font-content">
            {result.findings.length} total issue{result.findings.length !== 1 ? "s" : ""}
          </span>
        </div>

        <FindingsTable
          findings={result.findings}
          scanId={result.id}
          emptyMessage="No vulnerabilities or configuration issues were detected on this scan."
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );

}

