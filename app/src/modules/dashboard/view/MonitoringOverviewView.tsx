"use client";

import Link from "next/link";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import EmptyState from "@/modules/dashboard/component/EmptyState";


function formatInterval(minutes?: number | null): string {
  if (!minutes) return "Every 24 hours";
  if (minutes === 60) return "Every hour";
  if (minutes === 120) return "Every 2 hours";
  if (minutes === 360) return "Every 6 hours";
  if (minutes === 720) return "Every 12 hours";
  if (minutes === 1440) return "Every 24 hours (Daily)";
  if (minutes === 10080) return "Every week";
  if (minutes === 43200) return "Every month";
  if (minutes % 1440 === 0) return `Every ${minutes / 1440} days`;
  if (minutes % 60 === 0) return `Every ${minutes / 60} hours`;
  return `Every ${minutes} minutes`;
}

export default function MonitoringOverviewView() {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const { project, projectId, isLoading: projectLoading } = useActiveProject();

  const overview = useSuspenseQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
  });

  const schedule = useSuspenseQuery({
    ...trpc.project.schedule.queryOptions({ project_id: projectId }),
  });

  const toggleSchedule = useMutation({
    mutationFn: () =>
      client.project.updateSchedule.mutate({
        project_id: projectId,
        enabled: !schedule.data?.enabled,
      }),
    onSuccess: () => {
      toast.success(
        schedule.data?.enabled ? "Monitoring paused" : "Monitoring enabled",
      );
      queryClient.invalidateQueries({
        queryKey: trpc.project.schedule.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });

  if (projectLoading || overview.isLoading) return <LoadingSkeleton />;
  if (!project)
    return (
      <EmptyState
        icon={BarChart3}
        title="Create a project first"
        description="Monitoring requires a project with a configured website URL."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );

  const isFree = overview.data?.plan === "free";
  const isEnabled = Boolean(schedule.data?.enabled);

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        websiteUrl={project.website_url}
        title="Monitoring"
        description="Recurring checks and uptime monitoring for this project."
      />

      {/* Schedule status card */}
      <div className="mt-6 rounded-xl border border-[#e6e6e6] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex size-10 items-center justify-center rounded-xl ${
                isEnabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
              }`}
            >
              {isEnabled ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <XCircle className="size-5" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-semibold text-slate-900">
                  Recurring scans
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                    isEnabled
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isEnabled ? "Active" : "Paused"}
                </span>
              </div>
              <p className="mt-1 font-content text-sm text-slate-500">
                {isEnabled
                  ? `Enabled ${formatInterval(schedule.data?.interval_minutes)} for ${project.website_url}.`
                  : "No recurring scan is currently enabled for this project."}
              </p>
            </div>
          </div>
          <Button
            variant={isEnabled ? "outline" : "default"}
            disabled={toggleSchedule.isPending}
            onClick={() => toggleSchedule.mutate()}
            className={!isEnabled ? "bg-background-btn text-white" : ""}
          >
            {toggleSchedule.isPending
              ? "Updating…"
              : isEnabled
                ? "Pause monitoring"
                : "Enable monitoring"}
          </Button>
        </div>
        {isEnabled && schedule.data?.next_run_at && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5 text-slate-700">
            <Clock className="size-4 text-slate-400" />
            <p className="font-content text-xs text-slate-600">
              Next automated scan:{" "}
              <strong className="font-semibold text-slate-900">
                {new Date(schedule.data.next_run_at).toLocaleString()}
              </strong>
            </p>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/uptime"
          className="group rounded-xl border border-[#e6e6e6] bg-white p-5 transition hover:border-[#f43f5e]/30"
        >
          <h3 className="font-heading text-base text-slate-950">
            Uptime monitoring
          </h3>
          <p className="mt-1 font-content text-sm text-slate-500">
            Availability, response-time, and incident tracking.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 font-content text-sm text-[#f43f5e]">
            View uptime <ExternalLink className="size-3.5" />
          </span>
        </Link>
        <Link
          href="/dashboard/monitoring/incidents"
          className="group rounded-xl border border-[#e6e6e6] bg-white p-5 transition hover:border-[#f43f5e]/30"
        >
          <h3 className="font-heading text-base text-slate-950">Incidents</h3>
          <p className="mt-1 font-content text-sm text-slate-500">
            Downtime events and recovery tracking.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 font-content text-sm text-[#f43f5e]">
            View incidents <ExternalLink className="size-3.5" />
          </span>
        </Link>
      </div>

      {/* Manage schedules link */}
      <div className="mt-6 rounded-xl border border-[#e6e6e6] bg-white p-5">
        <h2 className="font-heading text-lg">Schedule configuration</h2>
        <p className="mt-2 font-content text-sm text-slate-500">
          Fine-tune scan intervals, environments, and notification settings.
        </p>
        <Link
          href="/dashboard/scans/schedules"
          className="mt-4 inline-flex items-center gap-1 font-content text-sm text-[#f43f5e]"
        >
          Manage schedules <ExternalLink className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

