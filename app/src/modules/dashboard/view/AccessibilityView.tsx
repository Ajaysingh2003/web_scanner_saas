"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Accessibility,
  Eye,
  Type,
  Image as ImageIcon,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";



export default function AccessibilityView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading } = useActiveProject();

  const overview = useQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
    enabled: !!project,
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
        icon={Accessibility}
        title="No Project Selected"
        description="Select or create a project to view WCAG accessibility audit signals."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );
  }

  const a11yFindings =
    latestScan.data?.findings?.filter((f: any) => f.category === "accessibility") || [];

  const contrastIssue = a11yFindings.some((f) => f.title.toLowerCase().includes("contrast"));
  const altIssue = a11yFindings.some((f) => f.title.toLowerCase().includes("alt") || f.title.toLowerCase().includes("image"));
  const labelIssue = a11yFindings.some((f) => f.title.toLowerCase().includes("label") || f.title.toLowerCase().includes("form"));
  const ariaIssue = a11yFindings.some((f) => f.title.toLowerCase().includes("aria") || f.title.toLowerCase().includes("role"));

  const wcagTiers = [
    {
      tier: "WCAG 2.2 Level A",
      label: "Essential Baseline",
      status: a11yFindings.filter((f) => f.severity === "critical" || f.severity === "high").length === 0 ? "pass" : "fail",
      desc: "Fundamental keyboard navigation, page titles, and essential image descriptions.",
    },
    {
      tier: "WCAG 2.2 Level AA",
      label: "Global Standard",
      status: !contrastIssue && !labelIssue ? "pass" : "fail",
      desc: "4.5:1 color contrast, clear focus indicators, visible form labels, and resizable text.",
    },
    {
      tier: "WCAG 2.2 Level AAA",
      label: "Enhanced Accessibility",
      status: "info",
      desc: "7:1 enhanced contrast, sign language alternatives, and strict no-interruption rules.",
    },
  ];

  const coreChecks = [
    {
      name: "Text & Background Color Contrast",
      status: !contrastIssue ? "pass" : "fail",
      detail: !contrastIssue ? "Meets WCAG AA minimum 4.5:1 ratio" : "Low contrast text detected on UI elements",
      icon: Eye,
    },
    {
      name: "Image Alternative Text (alt)",
      status: !altIssue ? "pass" : "fail",
      detail: !altIssue ? "All content images have meaningful alt text" : "Missing alt tags on informative images",
      icon: ImageIcon,
    },
    {
      name: "Form Input & Label Association",
      status: !labelIssue ? "pass" : "fail",
      detail: !labelIssue ? "All inputs have matching label or aria-label" : "Unlabeled inputs or missing for-attributes",
      icon: Type,
    },
    {
      name: "Keyboard Navigability & Focus Ring",
      status: !ariaIssue ? "pass" : "fail",
      detail: !ariaIssue ? "Interactive elements focusable with visual outline" : "Missing focus indicators or invalid ARIA roles",
      icon: Keyboard,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        websiteUrl={project.website_url}
        title="Accessibility (WCAG 2.2)"
        description="Audit color contrast ratios, screen reader compatibility, ARIA landmark roles, and keyboard navigation barriers."
        score={overview.data?.category_scores?.accessibility ?? null}
        scoreLabel="A11y Score"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/scans/run">
              <Button size="sm" className="bg-background-btn text-white h-9 px-4 text-xs gap-1.5 font-medium">
                Re-run A11y Audit
              </Button>
            </Link>
          </div>
        }
      />

      {/* WCAG Conformance Tiers */}

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
          WCAG 2.2 Conformance Tiers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {wcagTiers.map((t) => {
            const isPass = t.status === "pass";
            const isInfo = t.status === "info";
            return (
              <div
                key={t.tier}
                className={cn(
                  "rounded-xl border p-4 bg-white shadow-2xs space-y-2 flex flex-col justify-between",
                  isPass ? "border-slate-200/90" : isInfo ? "border-slate-200" : "border-amber-200 bg-amber-50/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {t.tier}
                    </span>
                    {isPass ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        <CheckCircle2 className="size-3 text-emerald-600" /> Compliant
                      </span>
                    ) : isInfo ? (
                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                        <AlertCircle className="size-3 text-amber-600" /> Action
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 mt-2.5">
                    {t.label}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 font-content leading-relaxed pt-2 border-t border-slate-100">
                  {t.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Criteria Checklist */}
      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
          Accessibility Evaluation Matrix
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {coreChecks.map((item) => {
            const Icon = item.icon;
            const isPass = item.status === "pass";
            return (
              <div
                key={item.name}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 bg-white shadow-2xs",
                  isPass ? "border-slate-200/90" : "border-amber-200 bg-amber-50/20"
                )}
              >
                <span className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
                  isPass ? "bg-emerald-50 text-emerald-600" : "bg-amber-100 text-amber-700"
                )}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      {item.name}
                    </span>
                    {isPass ? (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Pass
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Defect
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-content leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Findings Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
            All Accessibility Findings & Remediation Code
          </h2>
          <span className="text-xs text-slate-500 font-content">
            {a11yFindings.length} issue{a11yFindings.length !== 1 ? "s" : ""} detected
          </span>
        </div>
        <FindingsTable
          findings={a11yFindings}
          scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
          emptyMessage="No accessibility barriers detected. Color contrast, image alt attributes, and ARIA markup conform to WCAG 2.2 standards!"
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}


