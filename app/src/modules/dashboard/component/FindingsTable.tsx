"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Copy,
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronRight,
  LockKeyhole,
  Check,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  History,
  FileText,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPCClient } from "@/trpc/client";
import type { FindingItem, FindingProp, FindingRetest } from "@/modules/project/types";

export function getCategoryHref(category?: string, title?: string): string {
  const cat = (category || "").toLowerCase();
  const t = (title || "").toLowerCase();
  if (cat === "seo") return "/dashboard/seo";
  if (cat === "aeo") return "/dashboard/aeo";
  if (cat === "performance" || cat === "perf") return "/dashboard/performance";
  if (cat === "infrastructure" || cat === "domain" || cat === "dns") return "/dashboard/domain";
  if (cat === "compliance" || cat === "privacy") return "/dashboard/compliance";
  if (cat === "accessibility" || cat === "a11y") return "/dashboard/accessibility";
  if (cat === "configuration") return "/dashboard/security/headers";
  if (cat === "vulnerability") return "/dashboard/security/vulnerabilities";
  if (cat === "security") {
    if (
      t.includes("header") ||
      t.includes("hsts") ||
      t.includes("csp") ||
      t.includes("tls") ||
      t.includes("sri") ||
      t.includes("ssl") ||
      t.includes("x-frame")
    ) {
      return "/dashboard/security/headers";
    }
    return "/dashboard/security/vulnerabilities";
  }
  return "/dashboard/security";
}

interface FindingsTableProps {
  findings: FindingProp[];
  scanId?: string;
  emptyMessage?: string;
  showFilters?: boolean;
  lockedCount?: number;
}




const severityConfig: Record<
  string,
  { label: string; badge: string; dot: string; icon: typeof AlertCircle }
> = {
  critical: {
    label: "Critical",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    icon: AlertCircle,
  },
  high: {
    label: "High",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    icon: AlertTriangle,
  },
  medium: {
    label: "Medium",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: AlertTriangle,
  },
  low: {
    label: "Low",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
    icon: Info,
  },
  info: {
    label: "Info",
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    icon: Info,
  },
};

const triageConfig: Record<
  string,
  { label: string; badge: string; dot: string; desc: string }
> = {
  open: {
    label: "Open",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
    desc: "Active unresolved finding",
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    desc: "Remediation in progress",
  },
  accepted_risk: {
    label: "Accepted Risk",
    badge: "bg-zinc-100 text-zinc-600 border-zinc-200",
    dot: "bg-zinc-400",
    desc: "Business risk accepted",
  },
  false_positive: {
    label: "False Positive",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    desc: "Not applicable or tool noise",
  },
  resolved: {
    label: "Resolved",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    desc: "Verified resolved",
  },
};

type TriageTab = "all" | "active" | "in_progress" | "resolved" | "ignored";

export default function FindingsTable({
  findings,
  scanId,
  emptyMessage = "No findings are available for this category yet. Run a scan to populate this view.",
  showFilters = true,
  lockedCount,
}: FindingsTableProps) {

  const client = useTRPCClient();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState<TriageTab>("active");
  const [retestingId, setRetestingId] = useState<number | null>(null);
  const [openTriageMenuId, setOpenTriageMenuId] = useState<number | null>(null);
  const [historyFinding, setHistoryFinding] = useState<FindingProp | null>(null);
  const [noteDialog, setNoteDialog] = useState<{

    findingId: number;
    status: "accepted_risk" | "false_positive";
    note: string;
  } | null>(null);

  // Retest single finding mutation
  const retestMutation = useMutation({
    mutationFn: async ({ fId }: { fId: number }) => {
      if (!scanId) throw new Error("No scan ID available for re-test");
      return client.project.retestFinding.mutate({
        scan_id: scanId,
        finding_id: fId,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      if (data.retest_status === "resolved") {
        toast.success(
          `✓ Resolved! Vulnerability verified as fixed (${data.response_time_ms ? `${Math.round(data.response_time_ms)}ms` : "OK"})`,
          { duration: 4000 }
        );
      } else if (data.retest_status === "persisting") {
        toast.error(
          `⚠️ Still Present: Issue was detected on target website.`,
          { duration: 4000 }
        );
      } else if (data.retest_status === "target_unreachable") {
        toast(
          `⚠️ Target Unreachable (${data.http_status_code ? `HTTP ${data.http_status_code}` : "Timeout"}). Cannot verify fix on unreachable route.`,
          { duration: 5000 }
        );
      } else {
        toast.error(data.message || "Re-test completed with errors");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to execute re-test");
    },
    onSettled: () => {
      setRetestingId(null);
    },
  });

  // Update triage status mutation
  const triageMutation = useMutation({
    mutationFn: async ({
      fId,
      status,
      note,
    }: {
      fId: number;
      status: "open" | "in_progress" | "accepted_risk" | "false_positive" | "resolved";
      note?: string;
    }) => {
      if (!scanId) throw new Error("No scan ID available");
      return client.project.updateFindingTriage.mutate({
        scan_id: scanId,
        finding_id: fId,
        triage_status: status,
        triage_note: note,
      });
    },
    onSuccess: (updated) => {
      toast.success(`Status updated to ${triageConfig[updated.triage_status || "open"]?.label}`);
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update triage status");
    },
  });

  const handleRetest = (fId?: number | string) => {
    if (!scanId) {
      toast.error("Scan ID is required for live re-testing");
      return;
    }
    const numId = fId != null ? Number(fId) : null;
    if (numId == null || isNaN(numId)) {
      toast.error("Finding ID is required for re-test");
      return;
    }
    setRetestingId(numId);
    retestMutation.mutate({ fId: numId });
  };

  const handleStatusChange = (
    finding: FindingProp,
    newStatus: "open" | "in_progress" | "accepted_risk" | "false_positive" | "resolved"
  ) => {

    setOpenTriageMenuId(null);
    const numId = finding.id != null ? Number(finding.id) : null;
    if (numId == null || isNaN(numId)) {
      toast.error("Finding ID is required");
      return;
    }
    if (newStatus === "accepted_risk" || newStatus === "false_positive") {
      setNoteDialog({
        findingId: numId,
        status: newStatus,
        note: finding.triage_note || "",
      });
      return;
    }
    triageMutation.mutate({ fId: numId, status: newStatus });
  };


  const handleSaveNote = () => {
    if (!noteDialog) return;
    triageMutation.mutate({
      fId: noteDialog.findingId,
      status: noteDialog.status,
      note: noteDialog.note.trim() || undefined,
    });
    setNoteDialog(null);
  };

  if (!findings.length) {
    if (lockedCount && lockedCount > 0) {
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="p-8 text-center">
            <p className="font-heading text-sm font-medium text-slate-800">
              Audit findings detected in this section
            </p>
            <p className="mt-1 font-content text-xs text-slate-500">
              Findings for this category are included in your full project scan.
            </p>
          </div>
          <Link
            href="/pricing"
            className="flex items-center gap-3 bg-slate-50/80 px-4 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors border-t border-slate-100"
          >
            <LockKeyhole className="size-4 text-slate-400" />
            <span>Unlock {lockedCount} more findings and remediation details</span>
            <ChevronRight className="ml-auto size-4 text-slate-400" />
          </Link>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-xs">
        <CheckCircle2 className="mx-auto size-7 text-emerald-500" />
        <p className="mt-2 font-heading text-base font-semibold text-slate-900">
          All checks passed
        </p>
        <p className="mt-1 font-content text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }


  // Counts for tabs
  const countTotal = findings.length;
  const countActive = findings.filter(
    (f) => !f.triage_status || f.triage_status === "open" || f.triage_status === "in_progress"
  ).length;
  const countInProgress = findings.filter((f) => f.triage_status === "in_progress").length;
  const countResolved = findings.filter((f) => f.triage_status === "resolved").length;
  const countIgnored = findings.filter(
    (f) => f.triage_status === "accepted_risk" || f.triage_status === "false_positive"
  ).length;

  const filtered = findings.filter((item) => {
    const status = item.triage_status || "open";

    // Tab filter
    if (selectedTab === "active" && status !== "open" && status !== "in_progress") return false;
    if (selectedTab === "in_progress" && status !== "in_progress") return false;
    if (selectedTab === "resolved" && status !== "resolved") return false;
    if (selectedTab === "ignored" && status !== "accepted_risk" && status !== "false_positive")
      return false;

    // Search filter
    const title = item.title || "";
    const desc = item.description || "";
    const cat = item.category || "";
    const sev = (item.severity || "info").toLowerCase();

    const matchesSearch =
      !search ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      desc.toLowerCase().includes(search.toLowerCase()) ||
      cat.toLowerCase().includes(search.toLowerCase());

    // Severity filter
    const matchesSeverity =
      selectedSeverity === "all" ||
      sev === selectedSeverity.toLowerCase();

    return matchesSearch && matchesSeverity;
  });


  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* Top Toolbar */}
      {showFilters && (
        <div className="border-b border-slate-100 bg-slate-50/50 p-3.5 sm:px-5 space-y-3">
          {/* Triage Lifecycle Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedTab("active")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                  selectedTab === "active"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Active</span>
                <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-mono">
                  {countActive}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab("in_progress")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                  selectedTab === "in_progress"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>In Progress</span>
                <span className="rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.2 text-[10px] font-mono">
                  {countInProgress}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab("resolved")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                  selectedTab === "resolved"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Resolved</span>
                <span className="rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.2 text-[10px] font-mono">
                  {countResolved}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab("ignored")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                  selectedTab === "ignored"
                    ? "bg-white text-purple-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Ignored / Muted</span>
                <span className="rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.2 text-[10px] font-mono">
                  {countIgnored}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab("all")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                  selectedTab === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>All</span>
                <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-mono">
                  {countTotal}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full max-w-xs sm:w-64">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search findings..."
                className="h-8 pl-8 text-xs bg-white border-slate-200"
              />
            </div>
          </div>

          {/* Severity Badges Filter */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-medium text-slate-400 mr-1">Severity:</span>
            <button
              type="button"
              onClick={() => setSelectedSeverity("all")}
              className={`rounded-lg px-2 py-0.5 font-medium transition-colors ${
                selectedSeverity === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              All
            </button>
            {["critical", "high", "medium", "low", "info"].map((sev) => {
              const count = findings.filter(
                (f) => (f.severity || "info").toLowerCase() === sev
              ).length;
              if (count === 0) return null;
              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSelectedSeverity(sev)}
                  className={`rounded-lg px-2 py-0.5 font-medium capitalize transition-colors ${
                    selectedSeverity === sev
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {sev} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3 w-28">Severity</th>
              <th className="px-5 py-3 w-36">Status</th>
              <th className="px-5 py-3">Finding & Remediation</th>
              <th className="px-5 py-3 w-28 text-center">Category</th>
              <th className="px-5 py-3 w-48 text-right">Verification & Fix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length ? (
              filtered.map((finding) => {
                const sevKey = (finding.severity || "info").toLowerCase();

                const sev = severityConfig[sevKey] || severityConfig.info;
                const statusKey = finding.triage_status || "open";
                const triage = triageConfig[statusKey] || triageConfig.open;
                const numId = finding.id != null ? Number(finding.id) : null;
                const isRetesting = numId != null && retestingId === numId;
                const hasRetests = Boolean(finding.retests && finding.retests.length > 0);

                return (
                  <tr
                    key={finding.id ? String(finding.id) : `finding-${finding.title}`}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    {/* Severity */}
                    <td className="px-5 py-3.5 align-top">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${sev.badge}`}
                      >
                        <span className={`size-1.5 rounded-full ${sev.dot}`} />
                        {sev.label}
                      </span>
                    </td>

                    {/* Triage Status with Dropdown */}
                    <td className="px-5 py-3.5 align-top relative">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenTriageMenuId(
                              numId != null && openTriageMenuId === numId ? null : numId
                            )
                          }
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-90 ${triage.badge}`}
                        >
                          <span className={`size-1.5 rounded-full ${triage.dot}`} />
                          <span>{triage.label}</span>
                          <ChevronDown className="size-3 opacity-60 ml-0.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {numId != null && openTriageMenuId === numId && (

                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenTriageMenuId(null)}
                            />
                            <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                              <p className="px-2 py-1 text-[10px] font-semibold uppercase text-slate-400">
                                Change Status
                              </p>
                              {(
                                [
                                  "open",
                                  "in_progress",
                                  "resolved",
                                  "accepted_risk",
                                  "false_positive",
                                ] as const
                              ).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(finding, st)}
                                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-left transition-colors hover:bg-slate-100 ${
                                    statusKey === st
                                      ? "font-semibold text-slate-900 bg-slate-50"
                                      : "text-slate-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`size-1.5 rounded-full ${triageConfig[st].dot}`}
                                    />
                                    <span>{triageConfig[st].label}</span>
                                  </div>
                                  {statusKey === st && (
                                    <Check className="size-3.5 text-emerald-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Triage Note / History Indicator */}
                      {finding.triage_note && (
                        <p className="mt-1 font-content text-[11px] italic text-slate-400 line-clamp-1 max-w-[140px]" title={finding.triage_note}>
                          "{finding.triage_note}"
                        </p>
                      )}
                    </td>

                    {/* Title & Description */}
                    <td className="px-5 py-3.5 align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={`font-heading text-sm font-semibold transition-colors ${
                              statusKey === "resolved"
                                ? "text-slate-400 line-through"
                                : "text-slate-900"
                            }`}
                          >
                            {finding.title}
                          </p>
                          <p className="mt-1 font-content text-xs leading-relaxed text-slate-500 max-w-3xl">
                            {finding.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 align-top text-center">
                      <Link
                        href={getCategoryHref(finding.category, finding.title)}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-content text-[11px] font-medium uppercase tracking-wide text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        title={`Explore ${finding.category} diagnostics`}
                      >
                        <span>{finding.category}</span>
                        <ArrowUpRight className="size-2.5 opacity-60" />
                      </Link>
                    </td>


                    {/* Actions: Re-test & Copy Prompt */}
                    <td className="px-5 py-3.5 align-top text-right space-y-1.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1-Click Instant Verify Fix Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isRetesting || !scanId}
                          onClick={() => handleRetest(finding.id)}
                          className="h-7 px-2.5 text-xs gap-1.5 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 font-medium"
                          title="Run instant isolated check to verify if this issue is fixed on target"
                        >
                          {isRetesting ? (
                            <>
                              <Loader2 className="size-3 animate-spin text-slate-500" />
                              <span>Probing...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="size-3 text-slate-500" />
                              <span>Verify Fix</span>
                            </>
                          )}
                        </Button>

                        {/* Copy Prompt */}
                        {finding.remediation_prompt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                finding.remediation_prompt || ""
                              );
                              toast.success("Fix prompt copied to clipboard");
                            }}
                            title="Copy AI fix prompt for IDE / Coding agent"
                          >
                            <Copy className="size-3.5 text-slate-400" />
                          </Button>
                        )}

                        {/* Retest History Button */}
                        {hasRetests && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5 text-xs text-slate-400 hover:text-slate-700"
                            onClick={() => setHistoryFinding(finding)}
                            title="View verification audit log"
                          >
                            <History className="size-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Last Retested Timestamp */}
                      {finding.last_retested_at && (
                        <p className="text-[10px] font-mono text-slate-400 text-right">
                          Last probe: {new Date(finding.last_retested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-xs text-slate-500">
                  No findings match the selected status, severity, or search filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {lockedCount && lockedCount > 0 ? (
          <Link
            href="/pricing"
            className="flex items-center gap-3 bg-slate-50/80 px-4 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors border-t border-slate-100"
          >
            <LockKeyhole className="size-4 text-slate-400" />
            <span>Unlock {lockedCount} more findings and remediation details</span>
            <ChevronRight className="ml-auto size-4 text-slate-400" />
          </Link>
        ) : null}
      </div>


      {/* Note Prompt Dialog (Accepted Risk / False Positive) */}
      {noteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading text-sm font-semibold text-slate-900">
                Mark as {triageConfig[noteDialog.status]?.label}
              </h3>
              <button
                type="button"
                onClick={() => setNoteDialog(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Provide an optional explanation for why this finding is being muted / accepted for team auditability.
            </p>
            <textarea
              value={noteDialog.note}
              onChange={(e) =>
                setNoteDialog({ ...noteDialog, note: e.target.value })
              }
              placeholder="e.g. Compensating control in place via Cloudflare WAF; reviewed by Security Team"
              className="mt-3 w-full h-24 rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNoteDialog(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveNote}
                className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
              >
                Save Status
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Retest Verification History Modal */}
      {historyFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading text-sm font-semibold text-slate-900">
                  Verification Audit Log
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                  {historyFinding.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryFinding(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2.5 divide-y divide-slate-100">
              {historyFinding.retests && historyFinding.retests.length > 0 ? (
                historyFinding.retests.map((retest) => {
                  const isResolved = retest.status === "resolved";
                  const isUnreachable = retest.status === "target_unreachable";
                  return (
                    <div key={retest.id} className="pt-2.5 first:pt-0">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                            isResolved
                              ? "bg-emerald-50 text-emerald-700"
                              : isUnreachable
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isResolved
                                ? "bg-emerald-500"
                                : isUnreachable
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          <span className="capitalize">{retest.status.replace("_", " ")}</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {new Date(retest.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{retest.message}</p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-slate-400">
                        {retest.http_status_code && <span>HTTP {retest.http_status_code}</span>}
                        {retest.response_time_ms && (
                          <span>{Math.round(retest.response_time_ms)}ms latency</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-4 text-center text-xs text-slate-400">
                  No re-test history recorded yet.
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryFinding(null)}
                className="h-8 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
