"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import { Webhook, Trash2, CheckSquare, Square } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/modules/dashboard/component/PageHeader";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AVAILABLE_EVENTS = [
  { id: "scan.completed", label: "Scan Completed" },
  { id: "scan.failed", label: "Scan Failed" },
  { id: "scan.regression", label: "Scan Regression" },
  { id: "uptime.down", label: "Uptime Down" },
  { id: "uptime.recovered", label: "Uptime Recovered" },
];

export default function WebhooksView() {
  const { project, isLoading: isProjectLoading } = useActiveProject();
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  const { data: webhooks, isLoading: isWebhooksLoading } = useQuery({
    ...trpc.project.webhooks.queryOptions({ project_id: project?.id || "00000000-0000-0000-0000-000000000000" }),
    enabled: !!project?.id,
  });

  const createMutation = useMutation({
    mutationFn: (variables: {
      project_id: string;
      url: string;
      secret: string;
      events: [
        "scan.completed" | "scan.failed" | "scan.regression" | "uptime.down" | "uptime.recovered",
        ...("scan.completed" | "scan.failed" | "scan.regression" | "uptime.down" | "uptime.recovered")[]
      ];
    }) => client.project.createWebhook.mutate(variables),
    onSuccess: () => {
      toast.success("Webhook created");
      setUrl("");
      setSecret("");
      setEvents([]);
      queryClient.invalidateQueries({ queryKey: trpc.project.webhooks.queryKey() });
    },
    onError: () => toast.error("Failed to create webhook"),
  });

  const deleteMutation = useMutation({
    mutationFn: (variables: { project_id: string; webhook_id: string }) =>
      client.project.deleteWebhook.mutate(variables),
    onSuccess: () => {
      toast.success("Webhook deleted");
      queryClient.invalidateQueries({ queryKey: trpc.project.webhooks.queryKey() });
    },
    onError: () => toast.error("Failed to delete webhook"),
  });

  if (isProjectLoading || isWebhooksLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="Webhooks" description="Send real-time updates to your services." icon={Webhook} />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="Webhooks" description="Send real-time updates to your services." icon={Webhook} />
        <EmptyState title="No Project Selected" description="Please select a project to manage its webhooks." />
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || secret.length < 32 || events.length === 0) {
      toast.error("Please fill in all fields correctly.");
      return;
    }
    createMutation.mutate({
      project_id: project.id,
      url,
      secret,
      events: events as [any, ...any[]],
    });
  };

  const toggleEvent = (eventId: string) => {
    setEvents((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader title="Webhooks" description="Send real-time updates to your services." icon={Webhook} />

      <div className="rounded-xl border border-[#e6e6e6] bg-white p-5 mb-8">
        <h3 className="font-heading text-lg font-semibold mb-4">Add Endpoint</h3>
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payload URL</label>
              <Input
                type="url"
                placeholder="https://your-app.com/aetherscan"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secret (Min 32 chars)</label>
              <Input
                type="password"
                placeholder="32+ characters"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                minLength={32}
                required
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium">Events to send</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AVAILABLE_EVENTS.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => toggleEvent(evt.id)}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors"
                >
                  {events.includes(evt.id) ? (
                    <CheckSquare className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-300" />
                  )}
                  <span className="text-sm">{evt.label}</span>
                </div>
              ))}
            </div>
          </div>
          <Button
            type="submit"
            className="bg-background-btn text-white"
            disabled={createMutation.isPending || secret.length < 32 || !url || events.length === 0}
          >
            {createMutation.isPending ? "Adding..." : "Add Endpoint"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-[#e6e6e6] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">URL</th>
                <th className="px-5 py-4 font-medium">Events</th>
                <th className="px-5 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e6e6]">
              {(!webhooks || webhooks.length === 0) ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-slate-500">
                    No webhooks configured.
                  </td>
                </tr>
              ) : (
                webhooks.map((wh: any) => (
                  <tr key={wh.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-medium max-w-[200px] truncate" title={wh.url}>
                      {wh.url}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((evt: string) => (
                          <span key={evt} className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                            {evt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this webhook?")) {
                            deleteMutation.mutate({ project_id: project.id, webhook_id: wh.id });
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-[#f43f5e] hover:text-[#f43f5e] hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
