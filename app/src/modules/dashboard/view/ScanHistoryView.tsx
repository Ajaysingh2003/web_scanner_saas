"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Download,
  Eye,
  GitCompareArrows,
  Search,
  Clock3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  Activity,
  Play,
  History,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { cn } from "@/lib/utils";

const statusConfig = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  running: {
    label: "Running",
    icon: RefreshCw,
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
  },
  queued: {
    label: "Queued",
    icon: Clock3,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },
} as const;

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-slate-400">—</span>;
  const value = Math.round(score);
  const color =
    value >= 80
      ? "text-emerald-600"
      : value >= 50
        ? "text-amber-600"
        : "text-red-600";
  return <span className={cn("font-semibold", color)}>{value}/100</span>;
}

export default function ScanHistoryView() {
  const trpc = useTRPC();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const { project, projectId, isLoading } = useActiveProject();

  const history = useQuery({
    ...trpc.project.scanHistory.queryOptions({
      project_id: projectId,
    }),
    enabled: Boolean(project?.id),
    refetchInterval: 4000,
  });

  const rows = useMemo(
    () =>
      (history.data || []).filter(
        (scan) =>
          (status === "all" || scan.status === status) &&
          `${scan.scan_id} ${scan.scan_type}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [history.data, query, status],
  );

  // Summary stats
  const totalScans = history.data?.length || 0;
  const completedScans =
    history.data?.filter((s) => s.status === "completed").length || 0;
  const successRate =
    totalScans > 0 ? Math.round((completedScans / totalScans) * 100) : 0;

  const statusFilters = [
    { value: "all", label: "All", count: totalScans },
    { value: "completed", label: "Completed", count: completedScans },
    {
      value: "running",
      label: "Running",
      count: history.data?.filter((s) => s.status === "running").length || 0,
    },
    {
      value: "queued",
      label: "Queued",
      count: history.data?.filter((s) => s.status === "queued").length || 0,
    },
    {
      value: "failed",
      label: "Failed",
      count: history.data?.filter((s) => s.status === "failed").length || 0,
    },
  ];

  if (isLoading || history.isLoading) {
    return <LoadingSkeleton />;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <EmptyState
          icon={History}
          title="No Project Selected"
          description="Select or create a project to view its scan execution history."
          actionLabel="Create Project"
          actionHref="/dashboard/settings/project"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        websiteUrl={project.website_url}
        title="Scan History"
        description={`Execution logs, scores, and historical reports for ${project.name}.`}
        actions={
          <Link href="/dashboard/scans/run">
            <Button className="bg-background-btn text-white h-9 px-4 text-xs gap-1.5 font-medium">
              <Play className="size-3.5 fill-white" />
              Run New Scan
            </Button>
          </Link>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Total Scans</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-950">{totalScans}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-medium text-slate-500">Completed</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {completedScans}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-medium text-slate-500">Success Rate</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {successRate}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9 h-9 text-xs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search scan ID or type…"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatus(filter.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                status === filter.value
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {filter.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold",
                  status === filter.value
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Scan list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80">
              <tr className="text-xs font-medium text-slate-500 font-heading">
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Scan Type</th>
                <th className="px-6 py-3">Trigger</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Finished</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-content">
              {rows.map((scan) => {
                const statusInfo =
                  statusConfig[scan.status as keyof typeof statusConfig] || {
                    label: scan.status,
                    icon: Clock3,
                    badge:
                      "bg-slate-50 text-slate-600 border-slate-200",
                    dot: "bg-slate-400",
                    bar: "bg-slate-400",
                  };
                const StatusIcon = statusInfo.icon;
                const isRunning = scan.status === "running";
                return (
                  <tr
                    key={scan.scan_id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border",
                            statusInfo.badge,
                          )}
                        >
                          <StatusIcon
                            className={cn(
                              "h-4 w-4",
                              isRunning && "animate-spin",
                            )}
                          />
                        </span>
                        <div>
                          <span className="block font-medium text-slate-900 text-xs">
                            {statusInfo.label}
                          </span>
                          <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                            {scan.scan_id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                      {isRunning && (
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-500"
                            style={{ width: "60%" }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800 text-xs">
                        {scan.scan_type === "full"
                          ? "Full website audit"
                          : scan.scan_type}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {project.website_url || "website"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {scan.scan_type === "scheduled" ? "Cron" : "Manual"}
                    </td>
                    <td className="px-6 py-4">
                      <ScoreBadge score={scan.score} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {scan.finished_at
                        ? new Date(scan.finished_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "In progress"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          title="View report"
                          href={`/dashboard/scans/${scan.scan_id}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          title="Compare"
                          href={`/dashboard/scans/compare?scanId=${scan.scan_id}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <GitCompareArrows className="h-4 w-4" />
                        </Link>
                        <a
                          title="Download Markdown Report"
                          href={`/api/reports/${scan.scan_id}/export?format=markdown`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <Link href={`/dashboard/scans/${scan.scan_id}`}>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-xs text-slate-500"
                  >
                    No scan executions found for <strong>{project.name}</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}