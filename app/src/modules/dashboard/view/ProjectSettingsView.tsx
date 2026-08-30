"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import { Settings, Save, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/modules/dashboard/component/PageHeader";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ProjectSettingsView() {
  const { project, isLoading } = useActiveProject();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (project) {
      setName(project.name);
      setUrl(project.website_url);
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: (variables: { project_id: string; name: string; website_url: string }) =>
      client.project.update.mutate(variables),
    onSuccess: () => {
      toast.success("Project settings saved");
      // Force reload or invalidate to pick up changes in context
      queryClient.invalidateQueries();
    },
    onError: () => toast.error("Failed to update project"),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="Project Settings" description="Manage your project details." icon={Settings} />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="Project Settings" description="Manage your project details." icon={Settings} />
        <EmptyState title="No Project Selected" description="Please select a project to manage settings." />
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    updateMutation.mutate({ project_id: project.id, name: name.trim(), website_url: url.trim() });
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader title="Project Settings" description="Manage your project details." icon={Settings} />

      <div className="rounded-xl border border-[#e6e6e6] bg-white p-5 mb-8">
        <h3 className="font-heading text-lg font-semibold mb-4">General Settings</h3>
        <form onSubmit={handleSave} className="space-y-6 max-w-xl">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Website URL</label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Project ID (Read-only)</label>
            <Input value={project.id} readOnly className="bg-slate-50 text-slate-500 font-mono" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Created At</label>
            <div className="text-sm text-slate-600">
              {new Date(project.created_at).toLocaleString()}
            </div>
          </div>

          <Button type="submit" className="bg-background-btn text-white" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
        <h3 className="font-heading text-lg font-semibold text-rose-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Danger Zone
        </h3>
        <p className="text-sm text-rose-600 mb-4">
          Deleting a project will permanently remove all associated scans, findings, and configurations.
          This action cannot be undone.
        </p>
        <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-100 hover:text-rose-700" onClick={() => toast("Please contact support to delete your project.", { icon: "ℹ️" })}>
          Delete Project
        </Button>
      </div>
    </div>
  );
}
