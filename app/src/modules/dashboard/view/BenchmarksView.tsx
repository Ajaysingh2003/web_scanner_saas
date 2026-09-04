"use client";

import { useState, useEffect } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Globe,
  Save,
  Layers,
} from "lucide-react";

export default function BenchmarksView() {
  const { project, projectId, isLoading: projectLoading } = useActiveProject();
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  const { data: overview, isLoading: overviewLoading } = useSuspenseQuery(
    trpc.project.overview.queryOptions({ project_id: projectId }),
  );

  const { data: benchmarks, isLoading: benchmarksLoading } = useSuspenseQuery({
    ...trpc.project.benchmarks.queryOptions({
      project_id: projectId,
    }),
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasPending = data?.some(
        (b) => b.status === "running" || b.status === "queued",
      );
      return hasPending ? 3000 : false;
    },
  });

  const [competitors, setCompetitors] = useState<
    { label: string; url: string }[]
  >([]);

  // Sync initial state from loaded benchmarks
  useEffect(() => {
    if (benchmarks && benchmarks.length > 0) {
      setCompetitors(benchmarks.map((b) => ({ label: b.label, url: b.url })));
    }
  }, [benchmarks]);

  const saveMutation = useMutation({
    mutationFn: (newCompetitors: { label: string; url: string }[]) =>
      client.project.saveBenchmarks.mutate({
        project_id: projectId!,
        competitors: newCompetitors,
      }),
    onSuccess: () => {
      toast.success("Competitor benchmarks saved and queued for analysis");
      queryClient.invalidateQueries({
        queryKey: trpc.project.benchmarks.queryKey({
          project_id: projectId || "",
        }),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save competitor benchmarks");
    },
  });

  const handleAddCompetitor = () => {
    if (competitors.length >= 3) {
      toast.error("You can add up to 3 competitors");
      return;
    }
    setCompetitors([...competitors, { label: "", url: "" }]);
  };

  const handleRemoveCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const handleCompetitorChange = (
    index: number,
    field: "label" | "url",
    value: string,
  ) => {
    const updated = [...competitors];
    updated[index][field] = value;
    setCompetitors(updated);
  };

  const handleSave = () => {
    const valid = competitors.filter(
      (c) => c.label.trim() && c.url.trim().startsWith("http"),
    );
    if (valid.length === 0) {
      toast.error(
        "Please provide a competitor name and valid URL (including https://)",
      );
      return;
    }
    saveMutation.mutate(valid);
  };

  if (projectLoading || overviewLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <PageHeader
          title="Competitor Benchmarks"
          description="Compare your web performance, security posture, and SEO metrics directly against competitors."
        />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <PageHeader
          title="Competitor Benchmarks"
          description="Compare your web performance, security posture, and SEO metrics directly against competitors."
        />
        <EmptyState
          title="No Project Selected"
          description="Please select or create a project to configure competitor benchmarks."
        />
      </div>
    );
  }

  const ourScore = overview?.latest_scan?.score ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        websiteUrl={project.website_url}
        title="Competitor Benchmarks"
        description="Audit your website side-by-side against top competitors. Track comparative security scores, page load latency, and technical SEO health."
        actions={
          <Button
            onClick={handleAddCompetitor}
            disabled={competitors.length >= 3}
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
          >
            <Plus className="size-3.5" />
            Add Competitor ({competitors.length}/3)
          </Button>
        }
      />

      {/* Competitors Input Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-heading text-base font-semibold text-slate-950">
              Configured Competitors
            </h3>
            <p className="text-xs text-slate-500 font-content">
              Add up to 3 competitors to run automatic comparative audits.
            </p>
          </div>
          {competitors.length > 0 && (
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              size="sm"
              className="bg-background-btn text-white h-8 text-xs gap-1.5"
            >
              <Save className="size-3.5" />
              {saveMutation.isPending ? "Saving..." : "Save & Run Audits"}
            </Button>
          )}
        </div>

        {competitors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
            <Globe className="mx-auto size-6 text-slate-400" />
            <p className="mt-2 font-heading text-sm font-semibold text-slate-900">
              No competitors added yet
            </p>
            <p className="mt-1 font-content text-xs text-slate-500 max-w-md mx-auto">
              Add competitor websites to compare overall scores, audit vulnerabilities, and identify areas where you outrank or lag behind.
            </p>
            <Button
              onClick={handleAddCompetitor}
              size="sm"
              className="mt-4 bg-background-btn text-white h-8 text-xs gap-1.5"
            >
              <Plus className="size-3.5" /> Add Your First Competitor
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {competitors.map((comp, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5"
              >
                <div className="sm:w-1/3">
                  <Input
                    placeholder="Competitor Name (e.g. Acme Corp)"
                    value={comp.label}
                    onChange={(e) =>
                      handleCompetitorChange(idx, "label", e.target.value)
                    }
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Website URL (e.g. https://example.com)"
                    value={comp.url}
                    onChange={(e) =>
                      handleCompetitorChange(idx, "url", e.target.value)
                    }
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCompetitor(idx)}
                  className="h-9 w-9 text-slate-400 hover:text-[#f43f5e] hover:bg-rose-50 shrink-0"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Benchmark Results Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-slate-950">
            Comparative Benchmark Scores
          </h2>
          <span className="text-xs text-slate-500 font-content">
            Side-by-side audit health
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Website / Entity</th>
                  <th className="px-5 py-3">Audit Status</th>
                  <th className="px-5 py-3">Health Score</th>
                  <th className="px-5 py-3">Comparative Standing</th>
                  <th className="px-5 py-3 text-right">Last Analyzed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-content text-xs">
                {/* Our Project Row */}
                <tr className="bg-rose-50/30 font-medium">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#f43f5e] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        You
                      </span>
                      <span className="font-heading text-sm text-slate-900">
                        {project.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {project.website_url}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 className="size-3.5" />
                      Active
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {ourScore != null ? (
                      <span className="font-heading text-base font-bold text-slate-900">
                        {Math.round(ourScore)}
                        <span className="text-[10px] text-slate-400 font-normal">
                          /100
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-slate-600 font-medium">
                      Baseline Target
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-500">
                    {overview?.latest_scan?.finished_at
                      ? new Date(overview.latest_scan.finished_at).toLocaleString()
                      : "Recently"}
                  </td>
                </tr>

                {/* Competitor Rows */}
                {benchmarks && benchmarks.length > 0 ? (
                  benchmarks.map((benchmark, i) => {
                    const diff =
                      ourScore != null && benchmark.score != null
                        ? Math.round(ourScore - benchmark.score)
                        : null;
                    return (
                      <tr
                        key={benchmark.id || i}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-heading text-sm font-semibold text-slate-900">
                            {benchmark.label}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {benchmark.url}
                          </p>
                        </td>

                        <td className="px-5 py-3.5">
                          {benchmark.status === "completed" && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="size-3.5" />
                              Completed
                            </span>
                          )}
                          {benchmark.status === "running" && (
                            <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                              <Loader2 className="size-3.5 animate-spin" />
                              Scanning...
                            </span>
                          )}
                          {benchmark.status === "queued" && (
                            <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                              <BarChart3 className="size-3.5" />
                              Queued
                            </span>
                          )}
                          {benchmark.status === "failed" && (
                            <span className="inline-flex items-center gap-1 text-[#f43f5e] font-medium">
                              <AlertCircle className="size-3.5" />
                              Failed
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {benchmark.score != null ? (
                            <span className="font-heading text-base font-bold text-slate-900">
                              {Math.round(benchmark.score)}
                              <span className="text-[10px] text-slate-400 font-normal">
                                /100
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">Scanning…</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {diff != null ? (
                            diff > 0 ? (
                              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                +{diff} pts ahead of competitor
                              </span>
                            ) : diff < 0 ? (
                              <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                                {Math.abs(diff)} pts behind competitor
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                Tied score
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right text-slate-500">
                          {benchmark.last_scanned_at
                            ? new Date(benchmark.last_scanned_at).toLocaleString()
                            : "In progress"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-slate-500 text-xs"
                    >
                      No competitors scanned yet. Add up to 3 competitors above to view live benchmark comparisons.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
