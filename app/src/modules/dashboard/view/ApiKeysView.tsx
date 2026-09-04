"use client";

import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { Key, Copy, Trash2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ApiKeysView() {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<{ id: string; secret: string } | null>(null);

  const { data: keys, isLoading } = useSuspenseQuery(trpc.user.listApiKeys.queryOptions());

  const createMutation = useMutation({
    mutationFn: (variables: { name: string }) => client.user.createApiKey.mutate(variables),
    onSuccess: (data) => {
      setNewKey({ id: data.id, secret: data.secret });
      setName("");
      toast.success("API Key created successfully");
      queryClient.invalidateQueries({ queryKey: trpc.user.listApiKeys.queryKey() });
    },
    onError: () => toast.error("Failed to create API key"),
  });

  const revokeMutation = useMutation({
    mutationFn: (variables: { keyId: string }) => client.user.revokeApiKey.mutate(variables),
    onSuccess: () => {
      toast.success("API Key revoked");
      queryClient.invalidateQueries({ queryKey: trpc.user.listApiKeys.queryKey() });
    },
    onError: () => toast.error("Failed to revoke API key"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim() });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="API Keys" description="Manage your API keys for programmatic access." icon={Key} />
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader title="API Keys" description="Manage your API keys for programmatic access." icon={Key} />

      {newKey && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-amber-900 mb-1">Save your new API key</h3>
              <p className="text-sm text-amber-700 mb-4">
                Please copy this key now. For security reasons, you will not be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <Input value={newKey.secret} readOnly className="font-mono bg-white" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKey.secret)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#e6e6e6] bg-white p-5 mb-8">
        <h3 className="font-heading text-lg font-semibold mb-4">Create New Key</h3>
        <form onSubmit={handleCreate} className="flex gap-4">
          <Input
            placeholder="Key Name (e.g. CI/CD Pipeline)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-md"
            disabled={createMutation.isPending}
          />
          <Button type="submit" className="bg-background-btn text-white" disabled={!name.trim() || createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Key"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-[#e6e6e6] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Name</th>
                <th className="px-5 py-4 font-medium">Key Prefix</th>
                <th className="px-5 py-4 font-medium">Created</th>
                <th className="px-5 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e6e6]">
              {keys?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No API keys created yet.
                  </td>
                </tr>
              ) : (
                keys?.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-medium">{key.name}</td>
                    <td className="px-5 py-4 font-mono text-slate-500">
                      {key.id.substring(0, 8)}...
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {key.created_at ? new Date(key.created_at).toLocaleDateString() : "Recently"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to revoke this key? Any integrations using it will fail.")) {
                            revokeMutation.mutate({ keyId: key.id });
                          }
                        }}
                        disabled={revokeMutation.isPending}
                        className="text-[#f43f5e] hover:text-[#f43f5e] hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Revoke
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
