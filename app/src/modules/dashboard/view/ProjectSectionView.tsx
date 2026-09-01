"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  LockKeyhole,
  Plug,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC, useTRPCClient } from "@/trpc/client";

const content: Record<
  string,
  { title: string; description: string; category?: string }
> = {
  security: {
    title: "Security",
    description:
      "Headers, TLS, exposure, authentication, and application-risk findings from the latest audit.",
    category: "security",
  },
  "seo-aeo": {
    title: "SEO & AEO",
    description:
      "Search discoverability and answer-engine readiness from the latest audit.",
    category: "seo",
  },
  performance: {
    title: "Performance",
    description: "Performance signals and opportunities from the latest audit.",
    category: "performance",
  },
  domain: {
    title: "Domain",
    description: "TLS, DNS, email security, and domain-health signals.",
    category: "infrastructure",
  },
  compliance: {
    title: "Compliance",
    description: "Privacy, consent, and policy coverage indicators.",
    category: "compliance",
  },
  accessibility: {
    title: "Accessibility",
    description: "Accessibility findings and WCAG-oriented improvements.",
    category: "accessibility",
  },
  threats: {
    title: "Live threats",
    description: "Recent high-priority audit and uptime activity.",
  },
  monitoring: {
    title: "Monitoring",
    description: "Recurring checks and uptime monitoring for this project.",
  },
  uptime: {
    title: "Uptime",
    description: "Availability, response-time, and incident tracking.",
  },
  connections: {
    title: "Connections",
    description: "Secure project integrations and provider access.",
  },
  history: {
    title: "Project history",
    description: "Audit changes and project activity over time.",
  },
  "api-mcp": {
    title: "API & MCP",
    description: "Project-scoped API access and webhook automation.",
  },
  settings: {
    title: "Project settings",
    description: "URLs, scan profile, and recurring schedule settings.",
  },
  benchmarks: {
    title: "Competitor benchmarks",
    description: "Compare this project with up to three competitor websites.",
  },
  roi: {
    title: "ROI & revenue risk",
    description:
      "Translate LCP delay and traffic inputs into a directional revenue-risk estimate.",
  },
  reports: {
    title: "Reports & exports",
    description: "Export completed audits and manage their secure share links.",
  },
  billing: {
    title: "Billing",
    description: "Manage your subscription, usage, and Dodo Payments billing portal.",
  },
  account: {
    title: "Account",
    description: "Your signed-in Scanlyst account and security settings.",
  },
};

const scoreKey: Record<string, string> = {
  security: "vulnerability",
  "seo-aeo": "seo",
  performance: "performance",
  domain: "infrastructure",
  compliance: "compliance",
  accessibility: "accessibility",
};
const providerNames = [
  "github",
  "firebase",
  "vercel",
  "netlify",
  "cloudflare",
] as const;

function UpgradeGate({ title }: { title: string }) {
  return (
    <div className="mt-6 rounded-xl border border-[#e6e6e6] bg-white p-6">
      <LockKeyhole className="size-5 text-[#f43f5e]" />
      <h2 className="mt-3 font-heading text-lg text-slate-950">
        {title} is available on Pro and Max
      </h2>
      <p className="mt-2 font-content text-sm text-slate-500">
        Upgrade to unlock this project-level insight and keep the underlying
        scan data private.
      </p>
      <Link
        href="/dashboard/settings/billing"
        className="bg-background-btn mt-4 inline-flex h-9 items-center rounded-lg px-4 text-sm text-white"
      >
        View plans
      </Link>
    </div>
  );
}

import { useActiveProject } from "@/hooks/useActiveProject";

export default function ProjectSectionView() {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const routeParts = pathname.split("/").filter(Boolean);
  const section =
    routeParts[1] === "settings" &&
    ["billing", "account"].includes(routeParts[2] || "")
      ? routeParts[2]
      : routeParts[1] === "settings"
        ? "settings"
        : routeParts[1] || "dashboard";
  const item = content[section] || {
    title: "Project",
    description: "Manage this Scanlyst project.",
  };
  const { project, projectId } = useActiveProject();
  const overview = useQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
    enabled: Boolean(project),
  });
  const latest = useQuery({
    ...trpc.project.latestScan.queryOptions({ project_id: projectId }),
    enabled: Boolean(project && overview.data?.has_scan),
  });
  const paid = overview.data?.plan === "pro" || overview.data?.plan === "max";
  const schedule = useQuery({
    ...trpc.project.schedule.queryOptions({ project_id: projectId }),
    enabled: Boolean(project && section === "monitoring"),
  });
  const activity = useQuery({
    ...trpc.project.activity.queryOptions({ project_id: projectId }),
    enabled: Boolean(project && ["threats", "history"].includes(section)),
  });
  const connections = useQuery({
    ...trpc.project.providerConnections.queryOptions({ project_id: projectId }),
    enabled: Boolean(project && section === "connections"),
  });
  const webhooks = useQuery({
    ...trpc.project.webhooks.queryOptions({ project_id: projectId }),
    enabled: Boolean(project && section === "api-mcp"),
  });
  const benchmarks = useQuery({
    ...trpc.project.benchmarks.queryOptions({ project_id: projectId }),
    enabled: Boolean(project && paid && section === "benchmarks"),
    refetchInterval: 5000,
  });
  const roi = useQuery({
    ...trpc.project.roi.queryOptions({ project_id: projectId }),
    enabled: Boolean(project && paid && section === "roi"),
  });
  const history = useQuery({
    ...trpc.project.scanHistory.queryOptions({ project_id: projectId }),
    enabled: Boolean(project && section === "reports"),
  });
  const reportScanId = history.data?.find(
    (scan) => scan.status === "completed",
  )?.scan_id;
  const shares = useQuery({
    ...trpc.project.reportShares.queryOptions({
      scan_id: reportScanId || "00000000-0000-0000-0000-000000000000",
    }),
    enabled: Boolean(reportScanId && section === "reports"),
  });
  const billingAccount = useQuery({
    ...trpc.project.billingAccount.queryOptions(),
    enabled: section === "billing",
  });
  const billingPlans = useQuery({
    ...trpc.project.billingPlans.queryOptions(),
    enabled: section === "billing",
  });
  const account = useQuery({
    ...trpc.user.profile.queryOptions(),
    enabled: section === "account",
  });
  const [competitors, setCompetitors] = useState([
    { label: "Competitor 1", url: "" },
    { label: "Competitor 2", url: "" },
    { label: "Competitor 3", url: "" },
  ]);
  const [provider, setProvider] =
    useState<(typeof providerNames)[number]>("github");
  const [providerSecret, setProviderSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const saveBenchmarks = useMutation({
    mutationFn: () =>
      client.project.saveBenchmarks.mutate({
        project_id: projectId,
        competitors: competitors.filter((entry) => entry.url.trim()),
      }),
    onSuccess: () => {
      toast.success("Competitor scans queued");
      queryClient.invalidateQueries({
        queryKey: trpc.project.benchmarks.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });
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
        queryKey: trpc.project.providerConnections.queryKey({
          project_id: projectId,
        }),
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
        queryKey: trpc.project.providerConnections.queryKey({
          project_id: projectId,
        }),
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const createWebhook = useMutation({
    mutationFn: () =>
      client.project.createWebhook.mutate({
        project_id: projectId,
        url: webhookUrl,
        secret: webhookSecret,
        events: ["scan.completed", "scan.failed", "scan.regression"],
      }),
    onSuccess: () => {
      toast.success("Webhook saved");
      setWebhookUrl("");
      setWebhookSecret("");
      queryClient.invalidateQueries({
        queryKey: trpc.project.webhooks.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const revokeWebhook = useMutation({
    mutationFn: (webhookId: string) =>
      client.project.deleteWebhook.mutate({
        project_id: projectId,
        webhook_id: webhookId,
      }),
    onSuccess: () => {
      toast.success("Webhook removed");
      queryClient.invalidateQueries({
        queryKey: trpc.project.webhooks.queryKey({ project_id: projectId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const shareReport = useMutation({
    mutationFn: () =>
      client.project.createReportShare.mutate({
        scan_id: reportScanId!,
        expires_in_hours: 168,
      }),
    onSuccess: (share) => {
      navigator.clipboard.writeText(share.url);
      toast.success("Share link copied to clipboard");
      queryClient.invalidateQueries({
        queryKey: trpc.project.reportShares.queryKey({
          scan_id: reportScanId!,
        }),
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const revokeShare = useMutation({
    mutationFn: (linkId: string) =>
      client.project.revokeReportShare.mutate({
        scan_id: reportScanId!,
        link_id: linkId,
      }),
    onSuccess: () => {
      toast.success("Share link revoked");
      queryClient.invalidateQueries({
        queryKey: trpc.project.reportShares.queryKey({
          scan_id: reportScanId!,
        }),
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const openCheckout = useMutation({
    mutationFn: (plan: "starter" | "pro" | "max") =>
      client.project.createCheckout.mutate({ plan, interval: "monthly" }),
    onSuccess: ({ checkout_url }) => window.location.assign(checkout_url),
    onError: (error) => toast.error(error.message),
  });
  const openPortal = useMutation({
    mutationFn: () => client.project.createBillingPortal.mutate(),
    onSuccess: ({ portal_url }) => window.location.assign(portal_url),
    onError: (error) => toast.error(error.message),
  });
  const [urls, setUrls] = useState({
    name: project?.name || "",
  });
  const [displayName, setDisplayName] = useState("");
  const saveProject = useMutation({
    mutationFn: () =>
      client.project.update.mutate({ project_id: projectId, name: urls.name }),
    onSuccess: () => {
      toast.success("Project settings saved");
      queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
    },
    onError: (error) => toast.error(error.message),
  });
  const saveProfile = useMutation({
    mutationFn: () =>
      client.user.updateProfile.mutate({
        display_name: displayName.trim() || account.data?.display_name || null,
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: trpc.user.profile.queryKey() });
    },
    onError: (error) => toast.error(error.message),
  });
  const resetPassword = useMutation({
    mutationFn: () =>
      client.user.forgotPassword.mutate({ email: account.data!.email }),
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (error) => toast.error(error.message),
  });
  const logoutAll = useMutation({
    mutationFn: () => client.user.logoutAll.mutate(),
    onSuccess: () => {
      toast.success("All sessions ended");
      router.replace("/login");
    },
    onError: (error) => toast.error(error.message),
  });
  const findings = useMemo(
    () =>
      latest.data?.findings.filter(
        (finding) =>
          !item.category ||
          finding.category === item.category ||
          (section === "seo-aeo" && finding.category === "aeo"),
      ) || [],
    [item.category, latest.data?.findings, section],
  );

  if (!project)
    return (
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <ShieldCheck className="mx-auto size-10 text-slate-300" />
        <h1 className="mt-4 font-heading text-2xl text-slate-950">
          Create a project first
        </h1>
        <p className="mt-2 font-content text-sm text-slate-500">
          A dashboard section needs a project URL and scan history.
        </p>
        <Link
          className="bg-background-btn mt-6 inline-flex h-10 items-center rounded-lg px-4 text-sm text-white"
          href="/dashboard/settings/project"
        >
          Open project settings
        </Link>
      </section>
    );

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e6e6e6] pb-6">
        <div>
          <p className="font-content text-xs text-slate-500">
            {project.website_url}
          </p>
          <h1 className="mt-2 font-heading text-3xl text-slate-950">
            {item.title}
          </h1>
          <p className="mt-2 max-w-2xl font-content text-sm leading-6 text-slate-500">
            {item.description}
          </p>
        </div>
        {scoreKey[section] && (
          <div className="text-right">
            <p className="font-content text-xs text-slate-500">Current score</p>
            <p className="font-heading text-5xl text-slate-950">
              {Math.round(
                overview.data?.category_scores[scoreKey[section]] || 0,
              )}
              <span className="font-content text-sm text-slate-400">/100</span>
            </p>
          </div>
        )}
      </header>
      {(section === "benchmarks" || section === "roi") && !paid ? (
        <UpgradeGate title={item.title} />
      ) : (
        <>
          {section === "benchmarks" && (
            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
                <h2 className="font-heading text-lg">Add competitors</h2>
                <div className="mt-4 space-y-2">
                  {competitors.map((entry, index) => (
                    <div className="flex gap-2" key={index}>
                      <Input
                        value={entry.label}
                        onChange={(event) =>
                          setCompetitors((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, label: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Input
                        type="url"
                        placeholder="https://competitor.com"
                        value={entry.url}
                        onChange={(event) =>
                          setCompetitors((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, url: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button
                  className="bg-background-btn mt-4 text-white"
                  disabled={
                    saveBenchmarks.isPending ||
                    competitors.every((entry) => !entry.url)
                  }
                  onClick={() => saveBenchmarks.mutate()}
                >
                  {saveBenchmarks.isPending ? "Queueing…" : "Run benchmarks"}
                </Button>
              </div>
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
                <h2 className="font-heading text-lg">Score comparison</h2>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between border-b border-[#e6e6e6] pb-3 font-content text-sm">
                    <span>{project.name}</span>
                    <strong>{Math.round(overview.data?.score || 0)}/100</strong>
                  </div>
                  {(benchmarks.data || []).map((entry) => (
                    <div
                      className="flex justify-between font-content text-sm"
                      key={entry.id}
                    >
                      <span>{entry.label}</span>
                      <span>
                        {entry.score == null
                          ? entry.status
                          : `${Math.round(entry.score)}/100`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {section === "roi" && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                [
                  "Monthly sessions",
                  roi.data?.monthly_sessions?.toLocaleString() || "—",
                ],
                [
                  "Conversion risk",
                  `${roi.data?.estimated_conversion_loss_percent || 0}%`,
                ],
                [
                  "Revenue at risk",
                  `${roi.data?.currency || "USD"} ${Math.round(roi.data?.estimated_monthly_revenue_at_risk || 0).toLocaleString()}`,
                ],
              ].map(([label, value]) => (
                <div
                  className="rounded-xl border border-[#e6e6e6] bg-white p-5"
                  key={label}
                >
                  <p className="font-content text-sm text-slate-500">{label}</p>
                  <p className="mt-2 font-heading text-2xl text-slate-950">
                    {value}
                  </p>
                </div>
              ))}
              <p className="md:col-span-3 font-content text-xs text-slate-500">
                This is a directional estimate based on your saved traffic,
                order-value, conversion, and LCP inputs.
              </p>
            </div>
          )}
          {section === "monitoring" && (
            <div className="mt-6 rounded-xl border border-[#e6e6e6] bg-white p-5">
              <h2 className="font-heading text-lg">Recurring scans</h2>
              <p className="mt-2 font-content text-sm text-slate-500">
                {schedule.data?.enabled
                  ? `Enabled every ${schedule.data.interval_minutes} minutes for ${project.website_url}.`
                  : "No recurring scan is currently enabled."}
              </p>
              <Link
                href="/dashboard/scans/schedules"
                className="mt-4 inline-flex items-center gap-1 font-content text-sm text-[#f43f5e]"
              >
                Manage schedules <ExternalLink className="size-3.5" />
              </Link>
            </div>
          )}
          {(section === "threats" || section === "history") && (
            <div className="mt-6 space-y-2">
              {(activity.data || []).map((event, index) => (
                <article
                  key={`${event.type}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white p-4"
                >
                  <span
                    className={`size-2 rounded-full ${event.severity === "critical" || event.severity === "high" ? "bg-[#f43f5e]" : "bg-amber-400"}`}
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
                </article>
              ))}
              {!activity.data?.length && (
                <p className="mt-6 font-content text-sm text-slate-500">
                  No recent incidents or high-priority findings.
                </p>
              )}
            </div>
          )}
          {section === "connections" && (
            <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
                <Plug className="size-5 text-[#f43f5e]" />
                <h2 className="mt-3 font-heading text-lg">
                  Add provider connection
                </h2>
                <select
                  className="mt-4 h-8 w-full rounded-lg border border-[#e6e6e6] bg-white px-2 text-sm"
                  value={provider}
                  onChange={(event) =>
                    setProvider(event.target.value as typeof provider)
                  }
                >
                  {providerNames.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <Input
                  className="mt-2"
                  type="password"
                  value={providerSecret}
                  onChange={(event) => setProviderSecret(event.target.value)}
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
                        onClick={() =>
                          removeProvider.mutate(connection.provider)
                        }
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
          )}
          {section === "api-mcp" && (
            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
                <KeyRound className="size-5 text-[#f43f5e]" />
                <h2 className="mt-3 font-heading text-lg">Webhook delivery</h2>
                <Input
                  className="mt-4"
                  type="url"
                  placeholder="https://your-app.com/scanlyst"
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                />
                <Input
                  className="mt-2"
                  type="password"
                  placeholder="Signing secret (32+ characters)"
                  value={webhookSecret}
                  onChange={(event) => setWebhookSecret(event.target.value)}
                />
                <Button
                  className="bg-background-btn mt-3 text-white"
                  disabled={
                    createWebhook.isPending ||
                    webhookSecret.length < 32 ||
                    !webhookUrl
                  }
                  onClick={() => createWebhook.mutate()}
                >
                  Save webhook
                </Button>
              </div>
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
                <h2 className="font-heading text-lg">Configured webhooks</h2>
                <div className="mt-4 space-y-2">
                  {(webhooks.data || []).map((webhook) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"
                      key={webhook.id}
                    >
                      <span className="min-w-0 truncate font-content text-sm">
                        {webhook.url}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeWebhook.mutate(webhook.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  {!webhooks.data?.length && (
                    <p className="font-content text-sm text-slate-500">
                      No delivery webhooks configured.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {section === "reports" && (
            <div className="mt-6 rounded-xl border border-[#e6e6e6] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg">
                    Latest completed report
                  </h2>
                  <p className="mt-1 font-content text-sm text-slate-500">
                    Create a seven-day share link; its raw URL is shown only
                    once and copied immediately.
                  </p>
                </div>
                <Button
                  className="bg-background-btn text-white"
                  disabled={!reportScanId || shareReport.isPending}
                  onClick={() => shareReport.mutate()}
                >
                  <Link2 className="mr-1.5 size-3.5" />
                  Create share link
                </Button>
              </div>
              <div className="mt-5 space-y-2">
                {(shares.data || []).map((share) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                    key={share.id}
                  >
                    <span className="font-content text-sm">
                      {share.revoked_at
                        ? "Revoked"
                        : share.expires_at
                          ? `Expires ${new Date(share.expires_at).toLocaleDateString()}`
                          : "No expiry"}
                    </span>
                    {!share.revoked_at && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeShare.mutate(share.id)}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
                {!shares.data?.length && (
                  <p className="font-content text-sm text-slate-500">
                    No share links have been created for this report.
                  </p>
                )}
              </div>
              {reportScanId && (
                <div className="mt-5 flex gap-4">
                  <a
                    className="inline-flex items-center gap-1 font-content text-sm text-[#f43f5e]"
                    href={`/api/reports/${reportScanId}/export?format=markdown`}
                  >
                    Download Markdown <ExternalLink className="size-3.5" />
                  </a>
                  <a
                    className="inline-flex items-center gap-1 font-content text-sm text-[#f43f5e]"
                    href={`/api/reports/${reportScanId}/export?format=pdf`}
                  >
                    Download PDF <ExternalLink className="size-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
          {section === "settings" && (
            <div className="mt-6 max-w-2xl rounded-xl border border-[#e6e6e6] bg-white p-5">
              <h2 className="font-heading text-lg">Project URLs</h2>
              <div className="mt-4 grid gap-3">
                <Input
                  value={urls.name}
                  onChange={(event) =>
                    setUrls({ ...urls, name: event.target.value })
                  }
                  placeholder="Project name"
                />
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-medium text-slate-500">Website URL</p>
                  <p className="mt-1 truncate text-sm text-slate-700" title={project.website_url}>
                    {project.website_url}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">The website URL is fixed for this project.</p>
                </div>
              </div>
              <Button
                className="bg-background-btn mt-4 text-white"
                disabled={
                  saveProject.isPending || !urls.name
                }
                onClick={() => saveProject.mutate()}
              >
                Save project
              </Button>
            </div>
          )}
          {section === "billing" && (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
                <p className="font-content text-sm text-slate-500">
                  Current plan
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-heading text-2xl capitalize">
                    {billingAccount.data?.plan || "Starter"}
                  </h2>
                  <Button
                    variant="outline"
                    disabled={
                      openPortal.isPending ||
                      !billingAccount.data?.dodo_customer_configured
                    }
                    onClick={() => openPortal.mutate()}
                  >
                    Open billing portal
                  </Button>
                </div>
                <p className="mt-2 font-content text-sm text-slate-500">
                  {billingAccount.data?.usage_scans || 0} of{" "}
                  {billingAccount.data?.usage_limit ?? "unlimited"} scans used
                  this month.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(billingPlans.data || []).map((plan) => {
                  const isCurrent = billingAccount.data?.plan === plan.id;
                  const isFree = plan.id === "free";

                  return (
                    <div
                      className={`rounded-xl border p-5 bg-white ${isCurrent ? "border-[#f43f5e] ring-1 ring-rose-500/20" : "border-[#e6e6e6]"}`}
                      key={plan.id}
                    >
                      <h2 className="font-heading text-lg font-bold">{plan.name}</h2>
                      <p className="mt-2 font-content text-sm text-slate-500">
                        {plan.projects ?? "Unlimited"} {plan.projects === 1 ? "project" : "projects"} ·{" "}
                        {plan.scans_per_month ?? "Unlimited"} scans/mo
                      </p>
                      <Button
                        className={`mt-4 w-full ${
                          isCurrent
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : isFree
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-[#f43f5e] hover:bg-[#e11d48] text-white"
                        }`}
                        disabled={isCurrent || isFree || openCheckout.isPending}
                        onClick={() => !isFree && openCheckout.mutate(plan.id as "starter" | "pro" | "max")}
                      >
                        {isCurrent ? "Current Plan" : isFree ? "Free Tier" : `Choose ${plan.name}`}
                      </Button>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
          {section === "account" && (
            <div className="mt-6 grid max-w-4xl gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
                <div className="flex items-center gap-2">
                  <UserRound className="size-5 text-[#f43f5e]" />
                  <h2 className="font-heading text-lg">Profile</h2>
                </div>
                <p className="mt-3 font-content text-sm text-slate-500">
                  Email address
                </p>
                <p className="font-heading text-sm text-slate-950">
                  {account.data?.email || "Loading…"}
                </p>
                <p className="mt-4 font-content text-sm text-slate-500">
                  Display name
                </p>
                <Input
                  className="mt-1"
                  value={displayName}
                  placeholder={account.data?.display_name || "Add your name"}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
                <Button
                  className="bg-background-btn mt-3 text-white"
                  disabled={saveProfile.isPending}
                  onClick={() => saveProfile.mutate()}
                >
                  Save profile
                </Button>
              </div>
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
                <h2 className="font-heading text-lg">Authentication</h2>
                <div className="mt-4 space-y-3 font-content text-sm">
                  <div className="flex items-center justify-between">
                    <span>Email verification</span>
                    <span
                      className={
                        account.data?.email_verified_at
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }
                    >
                      {account.data?.email_verified_at ? "Verified" : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Two-step verification</span>
                    <span className="text-slate-500">Not configured</span>
                  </div>
                </div>
                <p className="mt-4 font-content text-xs leading-5 text-slate-500">
                  Two-step sign-in is not enabled for Scanlyst accounts yet.
                  Project scanner OTP sessions are separate and never become
                  account credentials.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  disabled={resetPassword.isPending || !account.data?.email}
                  onClick={() => resetPassword.mutate()}
                >
                  Send password reset email
                </Button>
              </div>
              <div className="rounded-xl border border-[#e6e6e6] bg-white p-5 lg:col-span-2">
                <h2 className="font-heading text-lg">Session security</h2>
                <p className="mt-2 font-content text-sm text-slate-500">
                  End every active browser session if you signed in on a shared
                  or lost device. You will need to sign in again.
                </p>
                <Button
                  variant="destructive"
                  className="mt-4"
                  disabled={logoutAll.isPending}
                  onClick={() => logoutAll.mutate()}
                >
                  Sign out of all devices
                </Button>
              </div>
            </div>
          )}
          {item.category && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg text-slate-950">
                  Latest findings
                </h2>
                <Link
                  href="/dashboard/scans"
                  className="font-content text-sm text-[#f43f5e]"
                >
                  View scan report
                </Link>
              </div>
              {findings.length ? (
                findings.map((finding) => (
                  <article
                    key={finding.id}
                    className="rounded-xl border border-[#e6e6e6] bg-white p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 size-2 rounded-full ${finding.severity === "critical" || finding.severity === "high" ? "bg-[#f43f5e]" : "bg-slate-300"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading text-base text-slate-950">
                          {finding.title}
                        </h3>
                        <p className="mt-1 font-content text-sm leading-6 text-slate-500">
                          {finding.description}
                        </p>
                      </div>
                      {finding.remediation_prompt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              finding.remediation_prompt || "",
                            );
                            toast.success("Fix prompt copied");
                          }}
                        >
                          <Copy className="mr-1.5 size-3.5" />
                          Copy fix prompt
                        </Button>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#e6e6e6] p-8 text-center">
                  <Activity className="mx-auto size-5 text-slate-300" />
                  <p className="mt-2 font-content text-sm text-slate-500">
                    No findings are available for this category yet. Run a scan
                    to populate this view.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
