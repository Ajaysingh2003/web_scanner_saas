"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Radio, AlertTriangle, ShieldAlert } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import EmptyState from "@/modules/dashboard/component/EmptyState";


export default function ThreatsView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading: projectLoading } = useActiveProject();

  const overview = useQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
    enabled: Boolean(project),
  });

  const activity = useQuery({
    ...trpc.project.activity.queryOptions({ project_id: projectId }),
    enabled: Boolean(project),
  });

  const threats = (activity.data || []).filter(
    (e) => e.severity === "critical" || e.severity === "high",
  );

  if (projectLoading || overview.isLoading) return <LoadingSkeleton />;
  if (!project)
    return (
      <EmptyState
        icon={Radio}
        title="Create a project first"
        description="Live threats require a project and at least one completed scan."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );

  const isFree = overview.data?.plan === "free";

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        websiteUrl={project.website_url}
        title="Live threats"
        description="Recent high-priority audit and uptime activity requiring attention."
      />

      {/* Threat count summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
          <p className="font-content text-xs text-slate-500">Active threats</p>
          <p className="mt-2 font-heading text-3xl text-slate-950">
            {threats.length}
          </p>
        </div>
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
          <p className="font-content text-xs text-slate-500">Critical</p>
          <p className="mt-2 font-heading text-3xl text-[#f43f5e]">
            {threats.filter((t) => t.severity === "critical").length}
          </p>
        </div>
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
          <p className="font-content text-xs text-slate-500">High</p>
          <p className="mt-2 font-heading text-3xl text-amber-500">
            {threats.filter((t) => t.severity === "high").length}
          </p>
        </div>
      </div>

      {/* Threat timeline */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-slate-950">
            Threat timeline
          </h2>
          <Link
            href="/dashboard/scans"
            className="font-content text-sm text-[#f43f5e]"
          >
            Run new scan
          </Link>
        </div>

        {threats.length ? (
          threats.map((event, index) => (
            <article
              key={`${event.type}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white p-4"
            >
              <span
                className={`size-2 rounded-full ${
                  event.severity === "critical"
                    ? "bg-[#f43f5e]"
                    : "bg-amber-400"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm">{event.title}</p>
                <p className="font-content text-xs text-slate-500">
                  {event.category} ·{" "}
                  {event.occurred_at
                    ? new Date(event.occurred_at).toLocaleString()
                    : "Recently"}
                </p>
              </div>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-content text-[10px] font-semibold uppercase text-slate-500">
                {event.type === "uptime_incident" ? "Uptime" : "Finding"}
              </span>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[#e6e6e6] p-8 text-center">
            <Radio className="mx-auto size-5 text-slate-300" />
            <p className="mt-2 font-content text-sm text-slate-500">
              No active threats detected.
            </p>
          </div>
        )}

      </div>
    </section>
  );
}


