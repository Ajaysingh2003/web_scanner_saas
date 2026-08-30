"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Trash2, CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import EmptyState from "@/modules/dashboard/component/EmptyState";

const providerNames = [
  { id: "github", label: "GitHub", description: "Repository and SAST scanning" },
  { id: "firebase", label: "Firebase", description: "Firebase security analysis" },
  { id: "vercel", label: "Vercel", description: "Hosting security checks" },
  { id: "netlify", label: "Netlify", description: "Hosting security checks" },
  { id: "cloudflare", label: "Cloudflare", description: "DNS and CDN security" },
] as const;

export default function ConnectionsProvidersView() {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const { project, projectId, isLoading: projectLoading } = useActiveProject();

  const connections = useQuery({
    ...trpc.project.providerConnections.queryOptions({ project_id: projectId }),
    enabled: Boolean(project),
  });

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState("");

  const saveProvider = useMutation({
    mutationFn: () =>
      client.project.saveProviderConnection.mutate({
        project_id: projectId,
        provider: selectedProvider as "github" | "firebase" | "vercel" | "netlify" | "cloudflare",
        configuration: { access_token: accessToken },
      }),
    onSuccess: () => {
      toast.success(`${selectedProvider} connected securely`);
      setAccessToken("");
      setSelectedProvider(null);
      queryClient.invalidateQueries({
        queryKey: trpc.project.providerConnections.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const removeProvider = useMutation({
    mutationFn: (provider: string) =>
      client.project.deleteProviderConnection.mutate({
        project_id: projectId,
        provider,
      }),
    onSuccess: () => {
      toast.success("Connection removed");
      queryClient.invalidateQueries({
        queryKey: trpc.project.providerConnections.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const connectedProviders = new Set(
    (connections.data || []).map((c) => c.provider),
  );

  if (projectLoading) return <LoadingSkeleton />;
  if (!project)
    return (
      <EmptyState
        icon={KeyRound}
        title="Create a project first"
        description="Provider connections require a project."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        websiteUrl={project.website_url}
        title="Provider access"
        description="Connect external providers for extended security scanning. Tokens are encrypted at rest and never returned."
      />

      {/* Provider cards grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providerNames.map((provider) => {
          const isConnected = connectedProviders.has(provider.id);
          const isSelected = selectedProvider === provider.id;

          return (
            <div
              key={provider.id}
              className={`rounded-xl border bg-white p-5 transition ${
                isSelected
                  ? "border-[#f43f5e] ring-1 ring-[#f43f5e]/20"
                  : "border-[#e6e6e6]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-base text-slate-950">
                  {provider.label}
                </h3>
                {isConnected && (
                  <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-content text-[10px] font-semibold text-emerald-600">
                    <CheckCircle2 className="size-3" /> Connected
                  </span>
                )}
              </div>
              <p className="mt-1 font-content text-xs text-slate-500">
                {provider.description}
              </p>

              {isSelected ? (
                <div className="mt-3 space-y-2">
                  <Input
                    type="password"
                    placeholder="Access token"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-background-btn text-white"
                      disabled={!accessToken || saveProvider.isPending}
                      onClick={() => saveProvider.mutate()}
                    >
                      {saveProvider.isPending ? "Connecting…" : "Connect"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedProvider(null);
                        setAccessToken("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  {isConnected ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => removeProvider.mutate(provider.id)}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedProvider(provider.id)}
                    >
                      <Plus className="mr-1 size-3.5" />
                      Connect
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Security note */}
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="font-content text-xs text-blue-700">
          <strong>Security:</strong> All provider tokens are encrypted at rest
          using AES-256 and are never exposed in API responses. Use scoped
          tokens with minimal permissions. Repository checks may accept a scoped
          GitHub token. Firebase/provider checks require their corresponding
          credentials.
        </p>
      </div>
    </section>
  );
}
