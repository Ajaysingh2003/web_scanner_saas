"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  GitCompareArrows,
  Minus,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { useActiveProject } from "@/hooks/useActiveProject";

export default function ScanCompareView() {
  const trpc = useTRPC();
  const params = useSearchParams();
  const { project, projectId } = useActiveProject();
  const history = useQuery({
    ...trpc.project.scanHistory.queryOptions({
      project_id: projectId,
    }),
    enabled: Boolean(project?.id),
  });

  const completedScans = (history.data || []).filter(
    (scan) => scan.status === "completed",
  );

  const [targetId, setTargetId] = useState<string>(
    params.get("scanId") || completedScans[0]?.scan_id || "",
  );
  const [baselineId, setBaselineId] = useState<string>(
    completedScans.find((scan) => scan.scan_id !== targetId)?.scan_id || "",
  );

  const diff = useQuery({
    ...trpc.project.scanDiff.queryOptions({
      scan_id: targetId || "00000000-0000-0000-0000-000000000000",
    }),
    enabled: Boolean(targetId),
  });
  const comparison = diff.data?.comparison;
  const delta = comparison?.score_delta ?? 0;
  const regression = comparison?.regression_detected ?? false;

  // Reset baseline if it equals target
  const handleTargetChange = (newTarget: string) => {
    setTargetId(newTarget);
    if (newTarget === baselineId) {
      setBaselineId(
        completedScans.find((scan) => scan.scan_id !== newTarget)?.scan_id || "",
      );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#f43f5e]">
          Diff engine
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Compare scans
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          See what changed between the selected audit and its previous completed
          run.
        </p>
      </div>

      {/* Scan selector */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Baseline Scan
          </label>
          <select
            value={baselineId}
            onChange={(e) => setBaselineId(e.target.value)}
            disabled={completedScans.length < 2}
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Select baseline</option>
            {completedScans.map((scan) => (
              <option key={scan.scan_id} value={scan.scan_id}>
                {new Date(scan.finished_at || "").toLocaleDateString()} ·{" "}
                {scan.scan_type === "full" ? "Full audit" : scan.scan_type} ·
                Score {Math.round(scan.score || 0)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Target Scan
          </label>
          <select
            value={targetId}
            onChange={(e) => handleTargetChange(e.target.value)}
            disabled={completedScans.length < 2}
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Select target</option>
            {completedScans.map((scan) => (
              <option key={scan.scan_id} value={scan.scan_id}>
                {new Date(scan.finished_at || "").toLocaleDateString()} ·{" "}
                {scan.scan_type === "full" ? "Full audit" : scan.scan_type} ·
                Score {Math.round(scan.score || 0)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {!comparison ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <GitCompareArrows className="h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            No comparison available
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Complete at least two scans to see changes.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Score delta */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingUp
                  className={cn(
                    "h-4 w-4",
                    delta > 0
                      ? "text-emerald-500"
                      : delta < 0
                        ? "text-red-500"
                        : "text-slate-400",
                  )}
                />
                <p className="text-xs font-medium text-slate-500">Score delta</p>
              </div>
              <p
                className={cn(
                  "mt-2 text-3xl font-bold",
                  delta > 0
                    ? "text-emerald-600"
                    : delta < 0
                      ? "text-red-600"
                      : "text-slate-900",
                )}
              >
                {delta > 0 ? "+" : ""}
                {delta}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {regression ? "Regression detected" : "No regression detected"}
              </p>
            </div>

            {/* New findings */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-xs font-medium text-slate-500">
                  New findings
                </p>
              </div>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {comparison.new_findings.length}
              </p>
            </div>

            {/* Resolved findings */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-medium text-slate-500">
                  Resolved findings
                </p>
              </div>
              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {comparison.fixed_findings.length}
              </p>
            </div>
          </div>

          {/* Findings changes */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Finding changes
              </h2>
            </div>

            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {/* New findings */}
              <div>
                <h3 className="flex items-center gap-1 text-sm font-semibold text-red-700">
                  <ArrowDownRight className="h-4 w-4" />
                  New since baseline
                </h3>
                {comparison.new_findings.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">No new findings</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {comparison.new_findings.map((finding) => (
                      <div
                        key={`${finding.scanner_name}-${finding.title}`}
                        className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-900"
                      >
                        <span className="font-medium">{finding.title}</span>
                        <span className="mt-1 block text-[10px] text-red-500">
                          {finding.scanner_name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resolved findings */}
              <div>
                <h3 className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
                  <ArrowUpRight className="h-4 w-4" />
                  Resolved
                </h3>
                {comparison.fixed_findings.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">No resolved findings</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {comparison.fixed_findings.map((finding) => (
                      <div
                        key={`${finding.scanner_name}-${finding.title}`}
                        className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900"
                      >
                        <span className="font-medium">{finding.title}</span>
                        <span className="mt-1 block text-[10px] text-emerald-500">
                          {finding.scanner_name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* No changes message */}
            {comparison.new_findings.length === 0 &&
              comparison.fixed_findings.length === 0 && (
                <div className="mt-6 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                  <Minus className="h-3.5 w-3.5" />
                  No finding changes in this comparison.
                </div>
              )}
          </section>
        </>
      )}
    </div>
  );
}