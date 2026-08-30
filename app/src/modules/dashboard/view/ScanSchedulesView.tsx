"use client";

import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Copy, Webhook, ArrowRight, BellRing, Clock3 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { cn } from "@/lib/utils";

import { useActiveProject } from "@/hooks/useActiveProject";

export default function ScanSchedulesView() {

  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const { project, projectId } = useActiveProject();

  const overview = useQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
    enabled: Boolean(project),
  });

  const schedule = useQuery({
    ...trpc.project.schedule.queryOptions({ project_id: projectId }),
    enabled: Boolean(project),
  });
  const webhooks = useQuery({
    ...trpc.project.webhooks.queryOptions({ project_id: projectId }),
    enabled: Boolean(project),
  });
  const update = useMutation({
    mutationFn: (enabled: boolean) =>
      client.project.updateSchedule.mutate({
        project_id: projectId,
        enabled,
        interval_minutes: schedule.data?.interval_minutes || 1440,
      }),
    onSuccess: () => {
      toast.success("Schedule updated");
      queryClient.invalidateQueries({
        queryKey: trpc.project.schedule.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const create = useMutation({
    mutationFn: () =>
      client.project.createWebhook.mutate({
        project_id: projectId,
        url,
        secret,
        events: ["scan.completed", "scan.failed", "scan.regression"],
      }),
    onSuccess: () => {
      toast.success("Webhook saved");
      setUrl("");
      setSecret("");
      queryClient.invalidateQueries({
        queryKey: trpc.project.webhooks.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const curl = `curl -X POST https://api.aetherscan.dev/api/v1/scans -H 'Authorization: Bearer $AETHERSCAN_API_KEY' -H 'Content-Type: application/json' -d '{"project_id":"${project?.id || "PROJECT_ID"}","environment":"production"}'`;

  if (!project)
    return (
      <div className="px-6 py-12 text-sm text-slate-500">
        Create a project before configuring schedules.
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#f43f5e]">
          Automation
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Scheduled scans
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Keep recurring audits predictable without duplicating manual work.
        </p>
      </div>

      {/* Schedule main card */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-[#f43f5e]">
            <CalendarClock className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">
              Full website audit
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {schedule.data?.enabled
                ? `Every ${schedule.data.interval_minutes} minutes · ${project?.website_url || "Production"}`
                : "Paused"}{" "}
              · Next run{" "}
              {schedule.data?.enabled && schedule.data?.next_run_at
                ? new Date(schedule.data.next_run_at).toLocaleString()
                : "not scheduled"}
            </p>
          </div>
          <Button
            variant={schedule.data?.enabled ? "outline" : "default"}
            className={cn(
              "gap-2",
              !schedule.data?.enabled && "bg-slate-900 text-white hover:bg-slate-800",
            )}
            disabled={update.isPending}
            onClick={() => update.mutate(!schedule.data?.enabled)}
          >
            {schedule.data?.enabled ? (
              <>
                <Clock3 className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <BellRing className="h-4 w-4" />
                Enable
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Webhook & CI */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Webhook card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-[#f43f5e]" />
            <h2 className="text-lg font-semibold text-slate-900">
              Delivery webhook
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Receive scan events in real time.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Webhook URL
              </label>
              <Input
                type="url"
                placeholder="https://your-app.com/aetherscan"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Signing secret
              </label>
              <Input
                type="password"
                placeholder="32+ characters"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <Button
            className="mt-4 bg-slate-900 text-white hover:bg-slate-800"
            disabled={create.isPending || !url || secret.length < 32}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Saving…" : "Save webhook"}
          </Button>
          {webhooks.data && webhooks.data.length > 0 && (
            <div className="mt-4 space-y-1">
              {webhooks.data.map((webhook) => (
                <p
                  key={webhook.id}
                  className="truncate text-xs text-slate-500"
                >
                  {webhook.url}
                </p>
              ))}
            </div>
          )}
        </section>

        {/* CI Trigger card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Trigger from CI
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Use a project API key from your deployment workflow.
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-950 p-4">
            <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-xs leading-5 text-slate-200">
              {curl}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={() => {
                navigator.clipboard.writeText(curl);
                toast.success("Curl command copied");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Results appear in scan history.
          </p>
        </section>
      </div>
    </div>
  );
}