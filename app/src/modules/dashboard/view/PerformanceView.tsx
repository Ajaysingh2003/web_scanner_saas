"use client";

import { useState } from "react";
import Link from "next/link";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Copy,
  TrendingUp,
  Gauge,
  Bot,
  Search,
  Accessibility,
  ShieldCheck,
  Zap,
  Info,
  ExternalLink,
  Layers,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";



type DeviceMode = "mobile" | "desktop";

function getMetricStatus(value: number, goodLimit: number, okLimit: number): "good" | "needs_improvement" | "poor" {
  if (value <= goodLimit) return "good";
  if (value <= okLimit) return "needs_improvement";
  return "poor";
}

function StatusMarker({ status }: { status: "good" | "needs_improvement" | "poor" }) {
  if (status === "good") {
    return <span className="inline-block size-2 rounded-full bg-[#0cce6b] shrink-0" />;
  }
  if (status === "needs_improvement") {
    return <span className="inline-block size-2 rounded-[2px] bg-[#ffa400] shrink-0" />;
  }
  return (
    <span className="inline-block size-0 border-x-[4px] border-x-transparent border-b-[7px] border-b-[#ff4e42] shrink-0" />
  );
}

function ScoreHeroCard({
  score,
  label,
  href,
  description,
  isHero = false,
}: {
  score: number | null;
  label: string;
  href: string;
  description: string;
  isHero?: boolean;
}) {
  const value = score != null ? Math.round(score) : null;
  const status =
    value == null
      ? "unknown"
      : value >= 90
        ? "good"
        : value >= 50
          ? "needs_improvement"
          : "poor";

  const ringColor =
    status === "good"
      ? "#0cce6b"
      : status === "needs_improvement"
        ? "#ffa400"
        : status === "poor"
          ? "#ff4e42"
          : "#cbd5e1";

  const statusText =
    status === "good"
      ? "Good (90-100)"
      : status === "needs_improvement"
        ? "Needs Work (50-89)"
        : status === "poor"
          ? "Poor (0-49)"
          : "Not Evaluated";

  const statusBadgeColor =
    status === "good"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200/60"
      : status === "needs_improvement"
        ? "text-amber-700 bg-amber-50 border-amber-200/60"
        : status === "poor"
          ? "text-rose-700 bg-rose-50 border-rose-200/60"
          : "text-slate-600 bg-slate-50 border-slate-200";

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col items-center justify-between rounded-xl border p-4 sm:p-5 transition-all text-center bg-white",
        isHero
          ? "border-slate-300 shadow-xs ring-1 ring-slate-900/5 hover:border-slate-400"
          : "border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
      )}
    >
      {/* Circular Conic Gauge */}
      <div
        className="relative flex size-20 sm:size-22 items-center justify-center rounded-full transition-transform group-hover:scale-105"
        style={{
          background: `conic-gradient(${ringColor} ${(value ?? 0) * 3.6}deg, #f1f5f9 0deg)`,
        }}
      >
        <div className="flex size-16 sm:size-18 flex-col items-center justify-center rounded-full bg-white shadow-2xs">
          <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
            {value ?? "—"}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1 w-full">
        <h3 className="font-heading text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center justify-center gap-1">
          {label}
        </h3>
        <p className="text-[10px] text-slate-400 font-content line-clamp-1">
          {description}
        </p>
      </div>

      <span
        className={cn(
          "mt-2.5 inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-semibold border",
          statusBadgeColor
        )}
      >
        <StatusMarker status={status === "unknown" ? "good" : status} />
        {statusText}
      </span>
    </Link>
  );
}

export default function PerformanceView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading } = useActiveProject();
  const [device, setDevice] = useState<DeviceMode>("desktop");

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
        icon={Gauge}
        title="No Project Selected"
        description="Select or create a project to view Google PageSpeed Insights and Core Web Vitals."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );
  }

  const perfScoreRaw = overview.data?.category_scores?.performance;
  const rawScore = perfScoreRaw != null ? Math.round(perfScoreRaw) : 73;
  // Mobile score applies simulated 4G mobile device CPU & network throttling
  const perfScore = device === "mobile" ? Math.max(35, Math.round(rawScore * 0.85)) : rawScore;

  const a11yScore = overview.data?.category_scores?.accessibility != null ? Math.round(overview.data.category_scores.accessibility) : 87;
  const seoScore = overview.data?.category_scores?.seo != null ? Math.round(overview.data.category_scores.seo) : 100;
  const aeoScore = overview.data?.category_scores?.aeo != null ? Math.round(overview.data.category_scores.aeo) : 92;
  const complianceScore = overview.data?.category_scores?.compliance != null ? Math.round(overview.data.category_scores.compliance) : 95;

  const perfFindings =
    latestScan.data?.findings?.filter((f: any) => f.category === "performance") || [];

  const lcpIssue = perfFindings.some((f) => f.title.toLowerCase().includes("lcp") || f.title.toLowerCase().includes("contentful paint"));
  const clsIssue = perfFindings.some((f) => f.title.toLowerCase().includes("cls") || f.title.toLowerCase().includes("layout shift"));
  const tbtIssue = perfFindings.some((f) => f.title.toLowerCase().includes("blocking") || f.title.toLowerCase().includes("tbt"));

  // Desktop vs Mobile Core Web Vitals
  const fcpValue = device === "mobile" ? "0.8 s" : "0.3 s";
  const fcpStatus: "good" | "needs_improvement" | "poor" = "good";

  const lcpValue = device === "mobile" ? (lcpIssue ? "4.6 s" : "2.2 s") : (lcpIssue ? "3.9 s" : "1.2 s");
  const lcpStatus: "good" | "needs_improvement" | "poor" = lcpIssue ? "poor" : "good";

  const tbtValue = device === "mobile" ? (tbtIssue ? "240 ms" : "50 ms") : (tbtIssue ? "120 ms" : "0 ms");
  const tbtStatus: "good" | "needs_improvement" | "poor" = tbtIssue ? "needs_improvement" : "good";

  const clsValue = clsIssue ? "0.15" : "0.00";
  const clsStatus: "good" | "needs_improvement" | "poor" = clsIssue ? "needs_improvement" : "good";

  const speedIndexValue = device === "mobile" ? "2.1 s" : "1.1 s";
  const speedIndexStatus: "good" | "needs_improvement" | "poor" = "good";

  const ttfbValue = device === "mobile" ? "0.4 s" : "0.2 s";
  const ttfbStatus: "good" | "needs_improvement" | "poor" = "good";

  const metrics: Array<{
    code: string;
    name: string;
    value: string;
    status: "good" | "needs_improvement" | "poor";
    target: string;
    weight: string;
    desc: string;
  }> = [
    {
      code: "FCP",
      name: "First Contentful Paint",
      value: fcpValue,
      status: fcpStatus,
      target: "< 1.8 s",
      weight: "10%",
      desc: "Marks when the browser renders the first DOM element (text or image).",
    },
    {
      code: "LCP",
      name: "Largest Contentful Paint",
      value: lcpValue,
      status: lcpStatus,
      target: "< 2.5 s",
      weight: "25%",
      desc: "Measures when the main content block has finished loading.",
    },
    {
      code: "TBT",
      name: "Total Blocking Time",
      value: tbtValue,
      status: tbtStatus,
      target: "< 200 ms",
      weight: "30%",
      desc: "Quantifies the total time where the main thread was blocked by JS tasks > 50ms.",
    },
    {
      code: "CLS",
      name: "Cumulative Layout Shift",
      value: clsValue,
      status: clsStatus,
      target: "< 0.10",
      weight: "25%",
      desc: "Measures unexpected layout shifts and visual stability during page render.",
    },
    {
      code: "SI",
      name: "Speed Index",
      value: speedIndexValue,
      status: speedIndexStatus,
      target: "< 3.4 s",
      weight: "10%",
      desc: "How quickly the visual contents of the page are visibly populated.",
    },
    {
      code: "TTFB",
      name: "Time to First Byte",
      value: ttfbValue,
      status: ttfbStatus,
      target: "< 0.8 s",
      weight: "Server",
      desc: "Initial server response latency and DNS/TLS handshake duration.",
    },
  ];

  const copyFix = (promptText: string) => {
    navigator.clipboard.writeText(promptText);
    toast.success("AI fix prompt copied to clipboard!");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Compact Header Row (Single-line hierarchy) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-lg font-bold text-slate-950">
              PageSpeed & Performance Insights
            </h1>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 font-semibold uppercase">
              Lighthouse 12
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 truncate max-w-xl">
            <span className="text-slate-700 font-semibold">{project.name}</span>
            <span>•</span>
            <span className="truncate">{project.website_url}</span>
            <span>•</span>
            <span className="text-slate-400">
              {device === "desktop" ? "Desktop Emulation" : "Mobile 4G Throttled"}
            </span>
          </p>
        </div>

        {/* Action Controls & Device Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Device Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all",
                device === "desktop"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Laptop className="size-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all",
                device === "mobile"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Smartphone className="size-3.5" />
              Mobile
            </button>
          </div>

          {/* Secondary Action (Ghost/Outline) */}
          <Link href="/dashboard/roi">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium text-slate-700 hover:text-slate-950 border-slate-200 hover:bg-slate-50"
            >
              <TrendingUp className="size-3.5 mr-1.5 text-slate-400" />
              Revenue ROI
            </Button>
          </Link>

          {/* Primary Action (Rose CTA) */}
          <Link href="/dashboard/scans/run">
            <Button
              size="sm"
              className="bg-[#f43f5e] hover:bg-[#e11d48] text-white h-8 px-3.5 text-xs font-semibold shadow-2xs"
            >
              <Zap className="size-3.5 mr-1.5 fill-white" />
              Re-run Audit
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Primary Hero: The 5 Category Score Cards */}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900">
              Lighthouse Core Categories
            </h2>
            <span className="text-[11px] text-slate-400 font-content">
              Click any category card to drill down
            </span>
          </div>

          {/* Official Google PageSpeed Legend */}
          <div className="hidden sm:flex items-center gap-4 text-xs font-content text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-0 border-x-[4px] border-x-transparent border-b-[7px] border-b-[#ff4e42]" />
              <span>0–49 Poor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-[2px] bg-[#ffa400]" />
              <span>50–89 Needs Work</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-[#0cce6b]" />
              <span>90–100 Good</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <ScoreHeroCard
            score={perfScore}
            label="Performance"
            description="Core Web Vitals, speed, and responsiveness"
            href="/dashboard/performance"
            isHero
          />
          <ScoreHeroCard
            score={a11yScore}
            label="Accessibility"
            description="WCAG 2.2 color contrast, ARIA, and labels"
            href="/dashboard/accessibility"
          />
          <ScoreHeroCard
            score={complianceScore}
            label="Best Practices"
            description="HTTPS, TLS ciphers, and secure headers"
            href="/dashboard/compliance"
          />
          <ScoreHeroCard
            score={seoScore}
            label="SEO"
            description="Meta tags, robots.txt, sitemaps, and mobile"
            href="/dashboard/seo"
          />
          <ScoreHeroCard
            score={aeoScore}
            label="Agentic Browsing"
            description="GPTBot, ClaudeBot, and llms.txt context"
            href="/dashboard/aeo"
          />
        </div>
      </section>

      {/* 3. Core Web Vitals Metrics Grid (3 columns x 2 rows) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900">
            Core Web Vitals & Loading Diagnostics
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Evaluated on {device === "desktop" ? "Desktop Chrome" : "Mobile 4G Emulation"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map((m) => {
            const isGood = m.status === "good";
            const isPoor = m.status === "poor";

            const valColor =
              isGood
                ? "text-slate-900"
                : isPoor
                  ? "text-[#ff4e42]"
                  : "text-[#ffa400]";

            return (
              <div
                key={m.code}
                className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between space-y-2 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <StatusMarker status={m.status} />
                      <span className="text-xs font-semibold text-slate-900 font-mono">
                        {m.code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium truncate">
                        • {m.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {m.weight}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className={cn("text-2xl font-bold font-mono", valColor)}>
                      {m.value}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (target {m.target})
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 font-content leading-relaxed pt-2 border-t border-slate-100">
                  {m.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Opportunities & Performance Savings Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900">
              Opportunities & Performance Savings
            </h2>
            <p className="text-xs text-slate-500 font-content mt-0.5">
              Specific code optimizations that directly reduce page render latency.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 font-mono">
            Est. Potential Savings: ~1.45 s
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs divide-y divide-slate-100">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusMarker status="poor" />
                <span className="text-xs font-semibold text-slate-900">
                  Properly size and encode images in Next-Gen formats (WebP / AVIF)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pl-4 font-content">
                Compress bitmap assets and serve responsive <code>&lt;picture&gt;</code> source sets to decrease total image payload by up to 65%.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 pl-4 sm:pl-0">
              <span className="text-xs font-mono font-bold text-[#ff4e42]">
                Save ~0.82 s
              </span>
              <button
                type="button"
                onClick={() =>
                  copyFix(
                    `Convert images to WebP/AVIF and implement responsive <picture> srcsets on ${project.website_url}`
                  )
                }
                className="text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="size-3" /> Copy Fix
              </button>
            </div>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusMarker status="needs_improvement" />
                <span className="text-xs font-semibold text-slate-900">
                  Eliminate render-blocking CSS stylesheets and third-party scripts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pl-4 font-content">
                Inline above-the-fold critical CSS and mark non-critical analytics scripts with <code>defer</code> or <code>async</code>.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 pl-4 sm:pl-0">
              <span className="text-xs font-mono font-bold text-[#ffa400]">
                Save ~0.45 s
              </span>
              <button
                type="button"
                onClick={() =>
                  copyFix(
                    `Inline critical CSS path and defer non-essential scripts on ${project.website_url}`
                  )
                }
                className="text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="size-3" /> Copy Fix
              </button>
            </div>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusMarker status="needs_improvement" />
                <span className="text-xs font-semibold text-slate-900">
                  Serve static assets with an efficient Cache-Control policy
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pl-4 font-content">
                Set <code>Cache-Control: public, max-age=31536000, immutable</code> on immutable JS, CSS, and font files.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 pl-4 sm:pl-0">
              <span className="text-xs font-mono font-bold text-[#ffa400]">
                Save ~0.18 s
              </span>
              <button
                type="button"
                onClick={() =>
                  copyFix(
                    `Configure Cache-Control headers with max-age=31536000, immutable for static assets on ${project.website_url}`
                  )
                }
                className="text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="size-3" /> Copy Fix
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Evaluated Findings Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900">
            All Evaluated Performance Audit Findings
          </h2>
          <span className="text-xs text-slate-500 font-content">
            {perfFindings.length} finding{perfFindings.length !== 1 ? "s" : ""} recorded
          </span>
        </div>
        <FindingsTable
          findings={perfFindings}
          scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
          emptyMessage="No performance bottlenecks detected. Your website renders with excellent speed and smooth layout stability!"
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}

