"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Play,
    RefreshCw,
    ShieldCheck,
    XCircle,
    Zap,
    BarChart3,
    Calendar,
    TrendingUp,
    TrendingDown,
    Minus,
} from "lucide-react";
import toast from "react-hot-toast";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";

import { Button } from "@/components/ui/button";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/hooks/useActiveProject";

// Single source of truth for status color. One accent family (rose) for
// primary/attention states, slate for everything neutral — no per-status
// rainbow of unrelated hues.
const statusMeta = {
    queued: {
        label: "Queued",
        icon: Clock3,
        badge: "bg-slate-50 text-slate-500 border-slate-200",
        dot: "bg-slate-400",
    },
    running: {
        label: "Running",
        icon: RefreshCw,
        badge: "bg-sky-50 text-sky-600 border-sky-200",
        dot: "bg-sky-500",
    },
    completed: {
        label: "Completed",
        icon: CheckCircle2,
        badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
        dot: "bg-emerald-500",
    },
    failed: {
        label: "Failed",
        icon: XCircle,
        badge: "bg-rose-50 text-rose-600 border-rose-200",
        dot: "bg-rose-500",
    },
} as const;

const severityMeta = {
    critical: { badge: "bg-rose-50 text-rose-600", dot: "bg-rose-500" },
    high: { badge: "bg-rose-50 text-rose-600", dot: "bg-rose-500" },
    medium: { badge: "bg-amber-50 text-amber-600", dot: "bg-amber-400" },
    low: { badge: "bg-slate-100 text-slate-500", dot: "bg-slate-300" },
} as const;

function severity(level: string) {
    return severityMeta[level as keyof typeof severityMeta] ?? severityMeta.low;
}

function ScoreRing({ score }: { score: number | null }) {
    const value = Math.max(0, Math.min(100, score ?? 0));
    const color =
        value >= 80 ? "#10b981" : value >= 50 ? "#f59e0b" : "#f43f5e";
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={radius} fill="none" stroke="#eef0f2" strokeWidth="6" />
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="font-heading text-xl font-semibold tracking-tight text-slate-900">
                    {score == null ? "—" : Math.round(score)}
                </span>
            </div>
        </div>
    );
}

function getScoreChange(
    current: number | null,
    previous: number | null,
): "up" | "down" | "same" | null {
    if (current == null || previous == null) return null;
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "same";
}

export default function ScansView() {
    const trpc = useTRPC();
    const trpcClient = useTRPCClient();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const [statusFilter, setStatusFilter] = useState("all");
    const { project: activeProject, projectId, isLoading } = useActiveProject();

    const historyQuery = useSuspenseQuery({
        ...trpc.project.scanHistory.queryOptions({
            project_id: projectId,
        }),
        refetchInterval: 4000,
    });

    const selectedId =
        searchParams.get("scanId") || historyQuery.data?.[0]?.scan_id;
    const detailQuery = useQuery({
        ...trpc.project.scanDetail.queryOptions({
            scan_id: selectedId || "00000000-0000-0000-0000-000000000000",
        }),
        enabled: Boolean(selectedId),
        refetchInterval: (query) =>
            query.state.data?.status === "queued" ||
                query.state.data?.status === "running"
                ? 2500
                : false,
    });

    const runScan = useMutation({
        mutationFn: () =>
            trpcClient.project.runScan.mutate({
                project_id: activeProject!.id,
            }),
        onSuccess: () => {
            toast.success("Audit queued");
            queryClient.invalidateQueries();
        },
        onError: (error) => toast.error(error.message || "Could not start audit"),
    });

    const filtered = useMemo(
        () =>
            (historyQuery.data || []).filter(
                (scan) => statusFilter === "all" || scan.status === statusFilter,
            ),
        [historyQuery.data, statusFilter],
    );

    const selected = detailQuery.data;
    const running =
        selected?.status === "queued" || selected?.status === "running";

    const trendData = (historyQuery.data || [])
        .slice()
        .reverse()
        .filter((scan) => scan.score != null && scan.finished_at)
        .map((scan) => ({
            date: new Date(scan.finished_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
            }),
            score: Math.round(scan.score!),
        }));

    const latestScore = historyQuery.data?.[0]?.score ?? null;
    const previousScore = historyQuery.data?.[1]?.score ?? null;
    const scoreChange = getScoreChange(latestScore, previousScore);

    if (!activeProject) {
        return (
            <div className="mx-auto max-w-2xl px-6 py-24 text-center">
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <ShieldCheck className="size-8 text-slate-400" />
                </div>
                <h1 className="font-heading mt-6 text-2xl font-semibold tracking-tight text-slate-900">
                    Create a project first
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Scans are tied to a project URL and environment.
                </p>
                <Link
                    href="/dashboard/settings/project"
                    className="bg-background-btn group mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-95"
                >
                    Project settings
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>
        );
    }

    if (historyQuery.isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-8">
                <div className="space-y-6">
                    <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
                    <div className="grid gap-5 lg:grid-cols-3">
                        <div className="h-72 animate-pulse rounded-xl bg-slate-100 lg:col-span-2" />
                        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
                    </div>
                    <div className="grid gap-5 lg:grid-cols-2">
                        <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
                        <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
                    </div>
                </div>
            </div>
        );
    }

    if (historyQuery.isError) {
        return (
            <div className="mx-auto max-w-2xl px-6 py-24 text-center">
                <div className="inline-flex rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <AlertTriangle className="size-8 text-rose-500" />
                </div>
                <h1 className="font-heading mt-6 text-xl font-semibold tracking-tight text-slate-900">
                    Scans could not load
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    {historyQuery.error.message}
                </p>
                <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => historyQuery.refetch()}
                >
                    Try again
                </Button>
            </div>
        );
    }

    return (
        <div className="font-content mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-medium uppercase tracking-wide text-rose-500">
                            Project scans
                        </span>
                        <span>·</span>
                        <span>{activeProject.name}</span>
                    </div>
                    <h1 className="font-heading mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                        Audit history
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {activeProject.website_url}
                    </p>
                </div>
                <Button
                    className="bg-background-btn text-white hover:brightness-95"
                    onClick={() => runScan.mutate()}
                    disabled={runScan.isPending || running}
                >
                    <Play className="mr-2 size-4" />
                    {runScan.isPending
                        ? "Queueing…"
                        : running
                            ? "Audit running"
                            : "Run full audit"}
                </Button>
            </div>

            {/* Trend and Summary */}
            <div className="grid gap-5 lg:grid-cols-3">
                <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold tracking-tight text-slate-800">
                                Score trend
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-400">
                                Completed full audits over time
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {scoreChange && (
                                <div
                                    className={cn(
                                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                                        scoreChange === "up" && "bg-emerald-50 text-emerald-600",
                                        scoreChange === "down" && "bg-rose-50 text-rose-600",
                                        scoreChange === "same" && "bg-slate-100 text-slate-500",
                                    )}
                                >
                                    {scoreChange === "up" && <TrendingUp className="size-3" />}
                                    {scoreChange === "down" && <TrendingDown className="size-3" />}
                                    {scoreChange === "same" && <Minus className="size-3" />}
                                    {scoreChange === "up" && "Improving"}
                                    {scoreChange === "down" && "Declining"}
                                    {scoreChange === "same" && "Stable"}
                                </div>
                            )}
                            <Activity className="size-4 text-slate-300" />
                        </div>
                    </div>

                    <div className="mt-4 h-52">
                        {trendData.length < 2 ? (
                            <div className="flex h-full flex-col items-center justify-center text-sm text-slate-400">
                                <BarChart3 className="mb-3 size-6 text-slate-200" />
                                Complete two audits to see score history
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={trendData}
                                    margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={5}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                                        axisLine={false}
                                        tickLine={false}
                                        dx={-5}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#fff",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "8px",
                                            color: "#0f172a",
                                            fontSize: "12px",
                                            padding: "6px 10px",
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                                        }}
                                        labelStyle={{ color: "#64748b" }}
                                        formatter={(value) => [`${value}`, "Score"]}
                                    />
                                    <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#f43f5e"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: "#f43f5e", strokeWidth: 0 }}
                                        activeDot={{ r: 5, fill: "#f43f5e" }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Scan summary
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                Total audits
                            </p>
                            <p className="font-heading mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
                                {historyQuery.data?.length || 0}
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                Completed
                            </p>
                            <p className="font-heading mt-1.5 text-2xl font-semibold tracking-tight text-emerald-600">
                                {historyQuery.data?.filter((scan) => scan.status === "completed").length || 0}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <Calendar className="size-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500">
                            Last audit:{" "}
                            {historyQuery.data?.[0]?.finished_at
                                ? new Date(historyQuery.data[0].finished_at).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })
                                : "Never"}
                        </span>
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-slate-400">
                        Each audit runs the configured scanner suite and stores score, progress,
                        findings, and remediation data.
                    </p>
                </section>
            </div>

            {/* List and Detail */}
            <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
                <section className="rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <h2 className="text-sm font-semibold tracking-tight text-slate-800">
                            All scans
                        </h2>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-200"
                        >
                            <option value="all">All statuses</option>
                            <option value="completed">Completed</option>
                            <option value="running">Running</option>
                            <option value="queued">Queued</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="p-10 text-center text-xs text-slate-400">
                            No scans match this filter.
                        </div>
                    ) : (
                        <div className="max-h-[540px] divide-y divide-slate-100 overflow-y-auto">
                            {filtered.map((scan) => {
                                const meta = statusMeta[scan.status];
                                const Icon = meta.icon;
                                const isSelected = selectedId === scan.scan_id;

                                return (
                                    <Link
                                        key={scan.scan_id}
                                        href={`/dashboard/scans/${scan.scan_id}`}
                                        className={cn(
                                            "group flex items-center gap-4 px-5 py-4 transition-colors",
                                            isSelected ? "bg-rose-50/60" : "hover:bg-slate-50",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                                                meta.badge,
                                            )}
                                        >
                                            <Icon className={cn("size-4", scan.status === "running" && "animate-spin")} />
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-slate-800">
                                                {scan.scan_type === "full"
                                                    ? "Full website audit"
                                                    : scan.scan_scope
                                                        ? `Standard · ${scan.scan_scope}`
                                                        : scan.scan_type}
                                            </span>
                                            <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                                                <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                                                {meta.label}
                                                {scan.finished_at && (
                                                    <>
                                                        <span className="text-slate-300">·</span>
                                                        {new Date(scan.finished_at).toLocaleDateString(undefined, {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </>
                                                )}
                                            </span>
                                        </span>

                                        <span className="flex items-center gap-3">
                                            <span className="font-heading text-base font-semibold tracking-tight text-slate-900">
                                                {scan.score == null ? "—" : Math.round(scan.score)}
                                            </span>
                                            <ChevronRight
                                                className={cn(
                                                    "size-4 transition-colors",
                                                    isSelected ? "text-rose-400" : "text-slate-300 group-hover:text-slate-400",
                                                )}
                                            />
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6">
                    {!selected ? (
                        <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <Zap className="size-7 text-slate-300" />
                            </div>
                            <p className="mt-4 text-sm text-slate-400">
                                Select a scan to inspect its progress and findings.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <Link
                                href="/dashboard"
                                className="group inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-rose-500"
                            >
                                <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
                                Overview
                            </Link>

                            <div className="mt-4 flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="font-heading text-lg font-semibold tracking-tight text-slate-900">
                                        {selected.scan_type === "full" ? "Full website audit" : selected.scan_type}
                                    </h2>
                                    <p className="mt-1 truncate text-xs text-slate-400">{selected.url}</p>
                                </div>
                                <ScoreRing score={selected.overall_score} />
                            </div>

                            {selected.progress && (
                                <div className="mt-6">
                                    <div className="mb-2 flex justify-between text-xs">
                                        <span className="font-medium text-slate-600">
                                            {selected.progress.current_scanner || statusMeta[selected.status].label}
                                        </span>
                                        <span className="text-slate-400">
                                            {selected.progress.completed_scanners}/{selected.progress.total_scanners} scanners
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-rose-500 transition-all duration-700 ease-out"
                                            style={{
                                                width: `${selected.progress.total_scanners ? (selected.progress.completed_scanners / selected.progress.total_scanners) * 100 : 0}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {selected.status === "failed" && (
                                <div className="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs text-rose-600">
                                    This audit failed before completion. Retry it to generate a fresh report.
                                </div>
                            )}

                            <div className="mt-6">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold tracking-tight text-slate-800">
                                        Findings
                                    </h3>
                                    <span className="text-xs text-slate-400">
                                        {selected.findings.length} found
                                    </span>
                                </div>

                                {selected.findings.length === 0 ? (
                                    <p className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center text-xs text-slate-400">
                                        No findings recorded for this audit yet.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {selected.findings.slice(0, 5).map((finding) => {
                                            const sev = severity(finding.severity);
                                            return (
                                                <div
                                                    key={finding.id}
                                                    className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
                                                >
                                                    <span className={cn("h-2 w-2 shrink-0 rounded-full", sev.dot)} />
                                                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                                        {finding.title}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                                            sev.badge,
                                                        )}
                                                    >
                                                        {finding.severity}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {selected.findings.length > 5 && (
                                            <p className="text-center text-[11px] text-slate-400">
                                                +{selected.findings.length - 5} more
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
