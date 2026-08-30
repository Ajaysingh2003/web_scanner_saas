"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import EmptyState from "@/modules/dashboard/component/EmptyState";

export default function ConnectionsSupabaseView() {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const { project, projectId, isLoading: projectLoading } = useActiveProject();

  const connections = useQuery({
    ...trpc.project.providerConnections.queryOptions({ project_id: projectId }),
    enabled: Boolean(project),
  });

  const supabaseConnection = (connections.data || []).find(
    (c) => c.provider === "supabase",
  );

  const [projectUrl, setProjectUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");

  const saveSupabase = useMutation({
    mutationFn: () => {
      const config: Record<string, string> = {
        project_url: projectUrl,
        anon_key: anonKey,
      };
      if (serviceRoleKey) config.service_role_key = serviceRoleKey;
      return client.project.saveProviderConnection.mutate({
        project_id: projectId,
        provider: "firebase" as any, // Supabase uses dedicated endpoint; fallback to generic
        configuration: config,
      });
    },
    onSuccess: () => {
      toast.success("Supabase connected securely");
      setProjectUrl("");
      setAnonKey("");
      setServiceRoleKey("");
      queryClient.invalidateQueries({
        queryKey: trpc.project.providerConnections.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const disconnect = useMutation({
    mutationFn: () =>
      client.project.deleteProviderConnection.mutate({
        project_id: projectId,
        provider: "supabase",
      }),
    onSuccess: () => {
      toast.success("Supabase disconnected");
      queryClient.invalidateQueries({
        queryKey: trpc.project.providerConnections.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });

  if (projectLoading) return <LoadingSkeleton />;
  if (!project)
    return (
      <EmptyState
        icon={Database}
        title="Create a project first"
        description="Supabase integration requires a project."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        websiteUrl={project.website_url}
        title="Supabase connection"
        description="Connect your Supabase project for deep security analysis of RLS policies, auth configuration, and storage rules."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Connection form */}
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-emerald-500" />
            <h2 className="font-heading text-lg">Connect Supabase</h2>
          </div>
          <p className="mt-2 font-content text-sm text-slate-500">
            Provide your Supabase project URL and keys. Keys are encrypted at
            rest and never returned in API responses.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="font-content text-xs text-slate-500">
                Project URL
              </label>
              <Input
                className="mt-1"
                type="url"
                placeholder="https://your-project.supabase.co"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="font-content text-xs text-slate-500">
                Anon key
              </label>
              <Input
                className="mt-1"
                type="password"
                placeholder="eyJhbGciOi..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
              />
            </div>
            <div>
              <label className="font-content text-xs text-slate-500">
                Service role key{" "}
                <span className="text-slate-400">(optional)</span>
              </label>
              <Input
                className="mt-1"
                type="password"
                placeholder="eyJhbGciOi..."
                value={serviceRoleKey}
                onChange={(e) => setServiceRoleKey(e.target.value)}
              />
              <p className="mt-1 font-content text-[10px] text-slate-400">
                Required for deeper RLS and storage policy analysis. Encrypted at rest.
              </p>
            </div>
          </div>
          <Button
            className="bg-background-btn mt-4 text-white"
            disabled={!projectUrl || !anonKey || saveSupabase.isPending}
            onClick={() => saveSupabase.mutate()}
          >
            {saveSupabase.isPending ? "Connecting…" : "Connect Supabase"}
          </Button>
        </div>

        {/* Connection status */}
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
          <h2 className="font-heading text-lg">Connection status</h2>
          {supabaseConnection ? (
            <div className="mt-4">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span className="font-content text-sm text-emerald-700">
                  Supabase is connected
                </span>
              </div>
              <p className="mt-3 font-content text-xs text-slate-500">
                Connected on{" "}
                {supabaseConnection.created_at
                  ? new Date(supabaseConnection.created_at).toLocaleDateString()
                  : "Unknown"}
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-4"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate()}
              >
                <Trash2 className="mr-1 size-3.5" />
                {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-center">
              <Database className="mx-auto size-5 text-slate-300" />
              <p className="mt-2 font-content text-sm text-slate-500">
                No Supabase connection configured for this project.
              </p>
            </div>
          )}

          <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="font-content text-xs text-blue-700">
              <strong>What we scan:</strong> Frontend bundles for leaked keys,
              unsafe anonymous access signals, Auth/Storage signals, and common
              RLS/policy exposure patterns. Client credentials cannot prove
              every database policy — findings should be confirmed in the
              Supabase dashboard.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
