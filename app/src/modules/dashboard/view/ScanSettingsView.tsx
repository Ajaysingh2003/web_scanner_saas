"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import { Clock, Save, Calendar, CheckCircle2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/modules/dashboard/component/PageHeader";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INTERVAL_OPTIONS = [
  { value: "60", label: "Every hour", description: "24 scans per day" },
  { value: "120", label: "Every 2 hours", description: "12 scans per day" },
  { value: "360", label: "Every 6 hours", description: "4 scans per day" },
  { value: "720", label: "Every 12 hours", description: "2 scans per day" },
  { value: "1440", label: "Every 24 hours (Daily)", description: "1 scan per day" },
  { value: "10080", label: "Every week", description: "1 scan per week" },
  { value: "43200", label: "Every month", description: "1 scan per month" },
];

export default function ScanSettingsView() {
  const { project, isLoading: isProjectLoading } = useActiveProject();
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(false);
  const [interval, setIntervalVal] = useState("1440");

  const { data: schedule, isLoading: isScheduleLoading } = useQuery({
    ...trpc.project.schedule.queryOptions({
      project_id: project?.id || "00000000-0000-0000-0000-000000000000",
    }),
    enabled: !!project?.id,
  });

  useEffect(() => {
    if (schedule) {
      setEnabled(schedule.enabled);
      setIntervalVal(String(schedule.interval_minutes || 1440));
    }
  }, [schedule]);

  const updateMutation = useMutation({
    mutationFn: (variables: {
      project_id: string;
      enabled: boolean;
      interval_minutes: number;
    }) => client.project.updateSchedule.mutate(variables),
    onSuccess: () => {
      toast.success("Scan schedule updated successfully");
      queryClient.invalidateQueries({
        queryKey: trpc.project.schedule.queryKey(),
      });
    },
    onError: (error) => toast.error(error.message || "Failed to update schedule"),
  });

  if (isProjectLoading || isScheduleLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          title="Scan Settings"
          description="Configure automated recurring security scans and monitoring cadence."
          icon={Clock}
        />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          title="Scan Settings"
          description="Configure automated recurring security scans and monitoring cadence."
          icon={Clock}
        />
        <EmptyState
          title="No Project Selected"
          description="Please select or create a project to configure scan schedules."
        />
      </div>
    );
  }

  const handleSave = () => {
    updateMutation.mutate({
      project_id: project.id,
      enabled,
      interval_minutes: Number(interval),
    });
  };

  const selectedOption =
    INTERVAL_OPTIONS.find((opt) => opt.value === interval) ||
    INTERVAL_OPTIONS[4];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        websiteUrl={project.website_url}
        title="Scan Settings"
        description="Configure automated recurring security scans and monitoring cadence."
        icon={Clock}
      />

      <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-6 border-b border-[#e6e6e6]">
            <div>
              <h3 className="font-heading text-lg font-semibold text-slate-950">
                Automated Scans
              </h3>
              <p className="mt-1 font-content text-sm text-slate-500">
                Regularly audit your website for new vulnerabilities, regressions, and score drops.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f43f5e]"></div>
            </label>
          </div>

          <div className="pt-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-900">
                  Scan Interval
                </label>
                <span className="text-xs text-slate-500 font-content">
                  {selectedOption.description}
                </span>
              </div>

              <Select
                value={interval}
                onValueChange={(val) => {
                  if (val) setIntervalVal(val);
                }}
              >
                <SelectTrigger className="w-full h-11 border-slate-300">
                  <SelectValue placeholder="Select scan frequency">
                    {selectedOption.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[calc(100vw-3rem)] sm:w-96">
                  {INTERVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col py-0.5">
                        <span className="font-medium text-slate-900">
                          {opt.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {opt.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick frequency presets */}
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Quick Presets
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "60", label: "Hourly" },
                  { value: "360", label: "6 Hours" },
                  { value: "1440", label: "Daily" },
                  { value: "10080", label: "Weekly" },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setIntervalVal(preset.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-all ${
                      interval === preset.value
                        ? "border-[#f43f5e] bg-rose-50/80 text-[#f43f5e]"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {!enabled && (
              <div className="rounded-lg bg-amber-50/80 border border-amber-200/80 p-3.5 flex items-start gap-2.5">
                <Clock className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Recurring scans are currently disabled. Toggle the switch above and click save to activate this scan schedule.
                </p>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <Button
                onClick={handleSave}
                className="bg-background-btn text-white px-5"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  "Saving…"
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Schedule Summary Card */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#e6e6e6] bg-white p-5 shadow-xs">
            <h4 className="font-heading text-base font-semibold text-slate-950 mb-3 flex items-center gap-2">
              <Calendar className="size-4 text-slate-500" />
              Schedule Summary
            </h4>
            <div className="space-y-3 font-content text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span
                  className={`font-semibold ${
                    enabled ? "text-emerald-600" : "text-slate-500"
                  }`}
                >
                  {enabled ? "Active" : "Disabled"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Cadence</span>
                <span className="font-medium text-slate-900">
                  {selectedOption.label}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Target Env</span>
                <span className="font-medium capitalize text-slate-900">
                  {schedule?.environment || "production"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Next Execution</span>
                <span className="font-medium text-slate-900 text-right text-xs">
                  {enabled && schedule?.next_run_at
                    ? new Date(schedule.next_run_at).toLocaleString()
                    : enabled
                    ? "Queued on save"
                    : "Not scheduled"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 flex items-start gap-3">
            <ShieldCheck className="size-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 leading-relaxed">
              <p className="font-semibold text-blue-900 mb-1">
                Zero Impact on Production
              </p>
              Scans use non-destructive read-only requests and obey rate-limiting limits to ensure your production server performance is never degraded.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
