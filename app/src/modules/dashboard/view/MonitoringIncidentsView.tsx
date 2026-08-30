"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import EmptyState from "@/modules/dashboard/component/EmptyState";

export default function MonitoringIncidentsView() {
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

  const incidents = (activity.data || []).filter(
    (e) => e.type === "uptime_incident",
  );

  if (projectLoading || overview.isLoading) return <LoadingSkeleton />;
  if (!project)
    return (
      <EmptyState
        icon={Activity}
        title="Create a project first"
        description="Incidents are tracked automatically when uptime monitoring is enabled."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        websiteUrl={project.website_url}
        title="Incidents"
        description="Downtime events and recovery tracking for this project."
      />

      {/* Summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
          <p className="font-content text-xs text-slate-500">Total incidents</p>
          <p className="mt-2 font-heading text-3xl text-slate-950">
            {incidents.length}
          </p>
        </div>
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
          <p className="font-content text-xs text-slate-500">Resolved</p>
          <p className="mt-2 font-heading text-3xl text-emerald-500">
            {incidents.filter((i) => i.status === "resolved").length}
          </p>
        </div>
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
          <p className="font-content text-xs text-slate-500">Open</p>
          <p className="mt-2 font-heading text-3xl text-[#f43f5e]">
            {incidents.filter((i) => i.status !== "resolved").length}
          </p>
        </div>
      </div>

      {/* Incident list */}
      <div className="mt-6 space-y-2">
        <h2 className="font-heading text-lg text-slate-950">Incident log</h2>
        {incidents.length ? (
          incidents.map((incident, index) => (
            <article
              key={`incident-${index}`}
              className="flex items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white p-4"
            >
              <span
                className={`size-2 rounded-full ${
                  incident.severity === "critical" || incident.severity === "high"
                    ? "bg-[#f43f5e]"
                    : "bg-amber-400"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm">{incident.title}</p>
                <p className="font-content text-xs text-slate-500">
                  {incident.category} ·{" "}
                  {incident.occurred_at
                    ? new Date(incident.occurred_at).toLocaleString()
                    : "Recently"}
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 font-content text-[10px] font-semibold uppercase ${
                  incident.status === "resolved"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-[#f43f5e]"
                }`}
              >
                {incident.status || "Open"}
              </span>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[#e6e6e6] p-8 text-center">
            <AlertTriangle className="mx-auto size-5 text-slate-300" />
            <p className="mt-2 font-content text-sm text-slate-500">
              No uptime incidents recorded. Your project is looking great!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}


