"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Boxes, Database, KeyRound, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import EmptyState from "@/modules/dashboard/component/EmptyState";

const providerNames = ["github", "firebase", "vercel", "netlify", "cloudflare"] as const;

export default function ConnectionsOverviewView() {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const { project, projectId, isLoading: projectLoading } = useActiveProject();

  const connections = useQuery({
    ...trpc.project.providerConnections.queryOptions({ project_id: projectId }),
    enabled: Boolean(project),
  });

  const [provider, setProvider] = useState<(typeof providerNames)[number]>("github");
  const [providerSecret, setProviderSecret] = useState("");

  const saveProvider = useMutation({
    mutationFn: () =>
      client.project.saveProviderConnection.mutate({
        project_id: projectId,
        provider,
        configuration: { access_token: providerSecret },
      }),
    onSuccess: () => {
      toast.success(`${provider} connected securely`);
      setProviderSecret("");
      queryClient.invalidateQueries({
        queryKey: trpc.project.providerConnections.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const removeProvider = useMutation({
    mutationFn: (value: string) =>
      client.project.deleteProviderConnection.mutate({
        project_id: projectId,
        provider: value,
      }),
    onSuccess: () => {
      toast.success("Connection removed");
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
        icon={Boxes}
        title="Create a project first"
        description="Connections require a project to be configured."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        websiteUrl={project.website_url}
        title="Connections"
        description="Secure project integrations and provider access."
      />

      {/* Sub-page links */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/connections/supabase"
          className="group rounded-xl border border-[#e6e6e6] bg-white p-5 transition hover:border-[#f43f5e]/30"
        >
          <Database className="size-5 text-emerald-500" />
          <h3 className="mt-3 font-heading text-base text-slate-950">Supabase</h3>
          <p className="mt-1 font-content text-sm text-slate-500">
            Connect your Supabase project for deep security analysis.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 font-content text-sm text-[#f43f5e]">
            Configure <ExternalLink className="size-3.5" />
          </span>
        </Link>
        <Link
          href="/dashboard/connections/providers"
          className="group rounded-xl border border-[#e6e6e6] bg-white p-5 transition hover:border-[#f43f5e]/30"
        >
          <KeyRound className="size-5 text-violet-500" />
          <h3 className="mt-3 font-heading text-base text-slate-950">Provider access</h3>
          <p className="mt-1 font-content text-sm text-slate-500">
            Connect GitHub, Firebase, Vercel, Netlify, or Cloudflare.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 font-content text-sm text-[#f43f5e]">
            Manage providers <ExternalLink className="size-3.5" />
          </span>
        </Link>
      </div>

      {/* Quick add + Connected list */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
          <h2 className="font-heading text-lg">Quick connect</h2>
          <select
            className="mt-4 h-8 w-full rounded-lg border border-[#e6e6e6] bg-white px-2 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
          >
            {providerNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <Input
            className="mt-2"
            type="password"
            value={providerSecret}
            onChange={(e) => setProviderSecret(e.target.value)}
            placeholder="Encrypted access token"
          />
          <Button
            className="bg-background-btn mt-3 text-white"
            disabled={!providerSecret || saveProvider.isPending}
            onClick={() => saveProvider.mutate()}
          >
            Connect provider
          </Button>
        </div>
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
          <h2 className="font-heading text-lg">Connected providers</h2>
          <div className="mt-4 space-y-2">
            {(connections.data || []).map((connection) => (
              <div
                className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                key={connection.id}
              >
                <span className="font-content text-sm capitalize">
                  {connection.provider}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProvider.mutate(connection.provider)}
                >
                  <Trash2 className="mr-1 size-3.5" />
                  Remove
                </Button>
              </div>
            ))}
            {!connections.data?.length && (
              <p className="font-content text-sm text-slate-500">
                No provider connections are configured.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
