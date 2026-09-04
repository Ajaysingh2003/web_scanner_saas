"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Clock, Filter } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import EmptyState from "@/modules/dashboard/component/EmptyState";

type FilterType = "all" | "finding" | "uptime_incident";

export default function ProjectHistoryView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading: projectLoading } = useActiveProject();
  const [filter, setFilter] = useState<FilterType>("all");

  const activity = useSuspenseQuery({
    ...trpc.project.activity.queryOptions({ project_id: projectId }),
  });

  const events = (activity.data || []).filter(
    (e) => filter === "all" || e.type === filter,
  );

  if (projectLoading) return <LoadingSkeleton />;
  if (!project)
    return (
      <EmptyState
        icon={Clock}
        title="Create a project first"
        description="Project history requires a project with scans or monitoring enabled."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        websiteUrl={project.website_url}
        title="Project history"
        description="Audit changes and project activity over time."
      />

      {/* Filter bar */}
      <div className="mt-6 flex items-center gap-2">
        <Filter className="size-4 text-slate-400" />
        {(
          [
            ["all", "All events"],
            ["finding", "Findings"],
            ["uptime_incident", "Uptime incidents"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            className={filter === value ? "bg-background-btn text-white" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
        <span className="ml-auto font-content text-xs text-slate-400">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Event timeline */}
      <div className="mt-4 space-y-2">
        {events.length ? (
          events.map((event, index) => (
            <article
              key={`${event.type}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white p-4"
            >
              <span
                className={`size-2 rounded-full ${
                  event.severity === "critical" || event.severity === "high"
                    ? "bg-[#f43f5e]"
                    : event.severity === "medium"
                      ? "bg-amber-400"
                      : "bg-slate-300"
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
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-content text-[10px] font-semibold uppercase text-slate-500">
                  {event.severity}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 font-content text-[10px] font-semibold uppercase ${
                    event.type === "uptime_incident"
                      ? "bg-violet-50 text-violet-600"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {event.type === "uptime_incident" ? "Uptime" : "Finding"}
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[#e6e6e6] p-8 text-center">
            <Clock className="mx-auto size-5 text-slate-300" />
            <p className="mt-2 font-content text-sm text-slate-500">
              No activity recorded for this project yet. Run a scan or enable
              monitoring to see history here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
