"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { FileText, FileDown, Link as LinkIcon, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { downloadReport, type ReportFormat } from "@/lib/report-export";

export default function ReportsView() {
  const { project, projectId, isLoading: projectLoading } = useActiveProject();
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  const { data: scanHistory, isLoading: historyLoading } = useQuery({
    ...trpc.project.scanHistory.queryOptions({ project_id: projectId || "00000000-0000-0000-0000-000000000000" }),
    enabled: !!project,
  });

  // Get the latest completed scan for reports/sharing
  const latestCompletedScan = scanHistory?.find(s => s.status === "completed");

  const { data: reportShares, isLoading: sharesLoading } = useQuery({
    ...trpc.project.reportShares.queryOptions({
      scan_id: latestCompletedScan?.scan_id || "00000000-0000-0000-0000-000000000000",
    }),
    enabled: !!latestCompletedScan?.scan_id,
  });

  const createShareMutation = useMutation({
    mutationFn: (expires_in_hours: number) =>
      client.project.createReportShare.mutate({ scan_id: latestCompletedScan!.scan_id, expires_in_hours }),
    onSuccess: (share) => {
      if (share?.url) {
        navigator.clipboard.writeText(share.url);
        toast.success("Share link created and copied to clipboard");
      } else {
        toast.success("Share link created");
      }
      queryClient.invalidateQueries({
        queryKey: trpc.project.reportShares.queryKey({ scan_id: latestCompletedScan?.scan_id || "" }),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create share link");
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: (link_id: string) =>
      client.project.revokeReportShare.mutate({ scan_id: latestCompletedScan!.scan_id, link_id }),
    onSuccess: () => {
      toast.success("Share link revoked");
      queryClient.invalidateQueries({
        queryKey: trpc.project.reportShares.queryKey({ scan_id: latestCompletedScan?.scan_id || "" }),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke share link");
    },
  });

  const handleCreateShare = () => {
    createShareMutation.mutate(168); // 7 days (168 hours)
  };

  const handleRevokeShare = (linkId: string) => {
    revokeShareMutation.mutate(linkId);
  };

  const handleExport = async (format: ReportFormat) => {
    if (!latestCompletedScan?.scan_id) return;
    try {
      await downloadReport(latestCompletedScan.scan_id, format);
      toast.success(`${format === "pdf" ? "PDF" : "Markdown"} report downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export this report");
    }
  };

  if (projectLoading || historyLoading || sharesLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="Reports & Exports" description="Export and share your audit results" />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="Reports & Exports" description="Export and share your audit results" />
        <EmptyState title="No project selected" description="Please select a project to view reports." />
      </div>
    );
  }

  const hasCompletedScans = scanHistory && scanHistory.some(s => s.status === "completed");

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader title="Reports & Exports" description="Export and share your audit results" />

      <div className="grid gap-6">
        {!hasCompletedScans ? (
          <EmptyState 
            title="No completed scans" 
            description="Run a scan first to generate reports and share links." 
          />
        ) : (
          <>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Panel */}
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
                <div className="mb-4">
                  <h3 className="font-heading text-lg font-medium">Export Latest Report</h3>
                  <p className="text-sm text-slate-500">Download the results of your most recent scan.</p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button variant="outline" className="h-11 w-full justify-start gap-2" onClick={() => void handleExport("pdf")}>
                      <FileText className="h-4 w-4 text-slate-500" />
                      Export as PDF
                      <FileDown className="h-4 w-4 ml-auto text-slate-400" />
                  </Button>
                  <Button variant="outline" className="h-11 w-full justify-start gap-2" onClick={() => void handleExport("markdown")}>
                      <FileText className="h-4 w-4 text-slate-500" />
                      Export as Markdown
                      <FileDown className="h-4 w-4 ml-auto text-slate-400" />
                  </Button>
                </div>
              </div>

              {/* Share Panel */}
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-medium">Share Links</h3>
                    <p className="text-sm text-slate-500">Create temporary access links for stakeholders.</p>
                  </div>
                  <Button 
                    onClick={handleCreateShare} 
                    disabled={createShareMutation.isPending}
                    size="sm"
                    className="bg-background-btn text-white gap-2"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Create Link
                  </Button>
                </div>

                {(!reportShares || reportShares.length === 0) ? (
                  <div className="py-6 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-[#e6e6e6]">
                    No active share links.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reportShares.map((share) => (
                      <div key={share.id} className="flex items-center justify-between p-3 rounded-lg border border-[#e6e6e6] bg-slate-50">
                        <div className="truncate pr-4 flex-1">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="h-3 w-3 text-slate-400" />
                            <span className="text-sm font-medium text-slate-800 truncate">
                              Link ID: {share.id.substring(0, 8)}...
                            </span>
                            {share.revoked_at && (
                              <span className="text-xs text-rose-500 font-semibold">(Revoked)</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {share.expires_at ? `Expires: ${new Date(share.expires_at).toLocaleDateString()}` : "No expiry"}
                          </div>
                        </div>
                        {!share.revoked_at && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeShare(share.id)}
                            disabled={revokeShareMutation.isPending}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Scan History Table */}
            <div className="rounded-xl border border-[#e6e6e6] bg-white overflow-hidden">
              <div className="p-5 border-b border-[#e6e6e6]">
                <h3 className="font-heading text-lg font-medium">Scan History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6e6e6]">
                    {scanHistory.map((scan) => (
                      <tr key={scan.scan_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-slate-900 font-medium">
                          {scan.finished_at ? new Date(scan.finished_at).toLocaleString() : "In progress"}
                        </td>
                        <td className="px-6 py-4 text-slate-600 capitalize">
                          {scan.scan_type}
                        </td>
                        <td className="px-6 py-4">
                          {scan.status === "completed" && (
                            <div className="flex items-center gap-1.5 text-emerald-600">
                              <CheckCircle className="h-4 w-4" />
                              <span>Completed</span>
                            </div>
                          )}
                          {scan.status === "failed" && (
                            <div className="flex items-center gap-1.5 text-[#f43f5e]">
                              <AlertCircle className="h-4 w-4" />
                              <span>Failed</span>
                            </div>
                          )}
                          {scan.status !== "completed" && scan.status !== "failed" && (
                            <div className="flex items-center gap-1.5 text-slate-600 capitalize">
                              <span>{scan.status}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {scan.score != null ? `${Math.round(scan.score)}/100` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

