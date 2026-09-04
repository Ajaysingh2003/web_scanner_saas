"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Gauge, CheckCircle2, XCircle, ExternalLink, Clock } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import EmptyState from "@/modules/dashboard/component/EmptyState";

export default function UptimeView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading: projectLoading } = useActiveProject();

  const overview = useSuspenseQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
  });

  const schedule = useSuspenseQuery({
    ...trpc.project.schedule.queryOptions({ project_id: projectId }),
  });

  const activity = useSuspenseQuery({
    ...trpc.project.activity.queryOptions({ project_id: projectId }),
  });

  const uptimeEvents = (activity.data || []).filter(
    (e) => e.type === "uptime_incident",
  );
  const hasMonitoring = schedule.data?.enabled;

  if (projectLoading || overview.isLoading) return <LoadingSkeleton />;
  if (!project)
    return (
      <EmptyState
        icon={Gauge}
        title="Create a project first"
        description="Uptime monitoring requires a project with a configured website URL."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        websiteUrl={project.website_url}
        title="Uptime"
        description="Availability, response-time, and incident tracking."
      />

      {/* Status card */}
      <div className="mt-6 rounded-xl border border-[#e6e6e6] bg-white p-5">
        <div className="flex items-center gap-3">
          {hasMonitoring ? (
            <CheckCircle2 className="size-5 text-emerald-500" />
          ) : (
            <XCircle className="size-5 text-slate-400" />
          )}
          <div>
            <h2 className="font-heading text-lg">
              {hasMonitoring ? "Uptime monitoring is active" : "Monitoring not configured"}
            </h2>
            <p className="mt-1 font-content text-sm text-slate-500">
              {hasMonitoring
                ? `Checking every ${schedule.data?.interval_minutes || 60} minutes for ${project.website_url}.`
                : "Enable recurring scans to start tracking uptime and receive incident notifications."}
            </p>
          </div>
        </div>
        {!hasMonitoring && (
          <Link
            href="/dashboard/settings/project/scans"
            className="bg-background-btn mt-4 inline-flex h-9 items-center rounded-lg px-4 text-sm text-white"
          >
            Enable monitoring
          </Link>
        )}
        {hasMonitoring && schedule.data?.next_run_at && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <Clock className="size-3.5 text-slate-400" />
            <p className="font-content text-xs text-slate-500">
              Next check:{" "}
              {new Date(schedule.data.next_run_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Recent uptime events */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-slate-950">
            Recent uptime events
          </h2>
          <Link
            href="/dashboard/monitoring/incidents"
            className="font-content text-sm text-[#f43f5e]"
          >
            View all incidents
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {uptimeEvents.length ? (
            uptimeEvents.slice(0, 10).map((event, index) => (
              <article
                key={`uptime-${index}`}
                className="flex items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white p-4"
              >
                <span
                  className={`size-2 rounded-full ${
                    event.severity === "critical" || event.severity === "high"
                      ? "bg-[#f43f5e]"
                      : "bg-amber-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-sm">{event.title}</p>
                  <p className="font-content text-xs text-slate-500">
                    {event.occurred_at
                      ? new Date(event.occurred_at).toLocaleString()
                      : "Recently"}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 font-content text-[10px] font-semibold uppercase ${
                    event.status === "resolved"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-[#f43f5e]"
                  }`}
                >
                  {event.status || "Open"}
                </span>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[#e6e6e6] p-8 text-center">
              <Gauge className="mx-auto size-5 text-slate-300" />
              <p className="mt-2 font-content text-sm text-slate-500">
                No uptime events recorded yet.
                {!hasMonitoring && " Enable monitoring to start tracking."}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

