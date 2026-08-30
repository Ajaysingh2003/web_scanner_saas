"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Check,
  Play,
  ShieldAlert,
  Globe,
  Search,
  Bot,
  Gauge,
  Accessibility,
  FileCheck2,
  Lock,
  Zap,
  Layers,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  KeyRound,
  Server,
  GitBranch,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { cn } from "@/lib/utils";

const standardAuditPillars = [
  {
    key: "full",
    title: "Full audit",
    desc: "Runs every security, SEO, AEO, performance, domain, and compliance scanner in one pass.",
    badge: "Recommended",
    categories: undefined,
    icon: ShieldCheck,
  },
  {
    key: "security",
    title: "Security & vulnerabilities",
    desc: "OWASP top 10, exposed secrets, security headers, TLS ciphers, and misconfigurations.",
    badge: "Core",
    categories: ["configuration", "vulnerability", "infrastructure"],
    icon: Lock,
  },
  {
    key: "seo",
    title: "Search engine optimization",
    desc: "Indexability, sitemaps, canonical tags, Open Graph cards, and mobile viewport.",
    badge: "Search",
    categories: ["seo"],
    icon: Search,
  },
  {
    key: "aeo",
    title: "Answer engine optimization",
    desc: "AI crawler policies (GPTBot, ClaudeBot, Perplexity), llms.txt, and JSON-LD schema.",
    badge: "AI visibility",
    categories: ["aeo"],
    icon: Bot,
  },
  {
    key: "performance",
    title: "Core Web Vitals & speed",
    desc: "Largest Contentful Paint, responsiveness, layout shift, and asset compression.",
    badge: "Performance",
    categories: ["performance"],
    icon: Gauge,
  },
  {
    key: "domain",
    title: "Domain & email security",
    desc: "SPF, DKIM, DMARC policy, and CAA DNS authorization.",
    badge: "DNS & mail",
    categories: ["infrastructure"],
    icon: Globe,
  },
  {
    key: "compliance",
    title: "Privacy & legal compliance",
    desc: "Cookie consent banners, privacy policy reachability, and subresource integrity.",
    badge: "Legal",
    categories: ["compliance"],
    icon: FileCheck2,
  },
  {
    key: "accessibility",
    title: "Accessibility (WCAG 2.2)",
    desc: "Color contrast, image alt text coverage, keyboard focus, and ARIA landmarks.",
    badge: "WCAG AA",
    categories: ["accessibility"],
    icon: Accessibility,
  },
];

const activeSecurityTests = [
  {
    key: "sql",
    title: "SQL injection probe",
    desc: "Tests inputs with error-based, boolean-blind, and time-delayed database queries.",
    icon: Terminal,
  },
  {
    key: "xss",
    title: "Active XSS (DOM & stored)",
    desc: "Runs an isolated headless browser to inject and execute safe canary scripts.",
    icon: Zap,
  },
  {
    key: "authentication",
    title: "Authentication & brute force",
    desc: "Tests login flows and checks rate-limiting against credential stuffing.",
    icon: KeyRound,
  },
  {
    key: "tenant_isolation",
    title: "Multi-tenant isolation",
    desc: "Runs cross-account access checks between two accounts to catch IDOR and tenant leaks.",
    icon: ShieldAlert,
  },
  {
    key: "robots",
    title: "Robots crawl policy",
    desc: "Reviews the full robots.txt tree and finds disallowed paths across public routes.",
    icon: Bot,
  },
];

const integrationScans = [
  {
    key: "github_sast",
    title: "GitHub code analysis",
    desc: "Static analysis on connected repositories to catch hardcoded secrets.",
    icon: GitBranch,
  },
  {
    key: "dependencies",
    title: "Dependency vulnerabilities",
    desc: "Scans package manifests for published CVE advisories.",
    icon: Layers,
  },
  {
    key: "firebase",
    title: "Firebase & Supabase security",
    desc: "Reviews security rules, auth configuration, and exposed tables.",
    icon: Server,
  },
];

const tabs = [
  { key: "standard" as const, label: "Standard audits", icon: Layers },
  { key: "active" as const, label: "Active penetration tests", icon: Terminal },
  { key: "integration" as const, label: "Cloud & repository scans", icon: Server },
];

type TabCategory = "standard" | "active" | "integration";

export default function RunScanView() {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const router = useRouter();
  const { project: activeProject, projectId, isLoading } = useActiveProject();

  const [activeTab, setActiveTab] = useState<TabCategory>("standard");
  const [selectedStandard, setSelectedStandard] = useState("full");
  const [selectedActive, setSelectedActive] = useState("sql");
  const [selectedIntegration, setSelectedIntegration] = useState("github_sast");

  const [authorized, setAuthorized] = useState(true);
  const [customUrl, setCustomUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginPath, setLoginPath] = useState("/login");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [providerToken, setProviderToken] = useState("");
  const [actorA, setActorA] = useState("");
  const [actorB, setActorB] = useState("");
  const [actorPasswordA, setActorPasswordA] = useState("");
  const [actorPasswordB, setActorPasswordB] = useState("");
  const [resourcePaths, setResourcePaths] = useState("/api/me");
  const [includePost, setIncludePost] = useState(true);
  const [includeTimeBased, setIncludeTimeBased] = useState(true);
  const [rateLimit, setRateLimit] = useState(false);

  const target = customUrl || activeProject?.website_url || "";
  const isTargetConfigured = Boolean(target.trim());

  const currentMode =
    activeTab === "standard"
      ? "standard"
      : activeTab === "active"
        ? selectedActive
        : selectedIntegration;

  const needsAuth = activeTab !== "standard" && currentMode !== "robots";

  const runMutation = useMutation({
    mutationFn: async () => {
      if (currentMode === "robots") {
        return client.project.runRobotsCrawl.mutate({ url: target });
      }
      if (!activeProject) {
        throw new Error("No active project found. Select or create a project first.");
      }
      if (activeTab === "standard") {
        const standardDef = standardAuditPillars.find((item) => item.key === selectedStandard);
        return client.project.runScan.mutate({
          project_id: activeProject.id,
          scan_type: selectedStandard === "full" ? "full" : "standard",
          scanner_categories: standardDef?.categories,
        });
      }
      if (!authorized) {
        throw new Error("Confirm authorization before starting an active penetration test");
      }
      if (currentMode === "sql") {
        return client.project.runSqlInjection.mutate({
          project_id: activeProject.id,
          authorized: true,
          include_post_requests: includePost,
          include_time_based: includeTimeBased,
          max_pages: 25,
        });
      }
      if (currentMode === "xss") {
        return client.project.runXss.mutate({
          project_id: activeProject.id,
          authorized: true,
          include_post_requests: includePost,
          max_pages: 25,
        });
      }
      if (currentMode === "authentication") {
        return client.project.runAuthenticationScan.mutate({
          project_id: activeProject.id,
          authorized: true,
          production_confirmed: true,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret,
          test_account: { email: identifier, identifier, password },
          flow: {
            type: "login",
            steps: [
              { action: "open_url", url: loginPath },
              { action: "fill", selector: "input[name=email]", value_from: "test_account.email" },
              { action: "fill", selector: "input[name=password]", value_from: "test_account.password" },
              { action: "click", selector: "button[type=submit]" },
            ],
          },
          rate_limit_probe: {
            enabled: rateLimit,
            start_url: loginPath,
            identifier_selector: "input[name=email]",
            identifier_from: "test_account.email",
            password_selector: "input[name=password]",
            submit_selector: "button[type=submit]",
            wrong_password: rateLimit ? "invalid-aetherscan-password" : undefined,
            attempts: 5,
            delay_ms: 500,
          },
          include_password_reset: false,
        });
      }
      return client.project.runExtendedScan.mutate({
        scan_type: currentMode as any,
        project_id: activeProject.id,
        url: target,
        authorized: true,
        repository_url: repositoryUrl || undefined,
        github_token: providerToken || undefined,
        firebase_access_token: providerToken || undefined,
        tenant_test_mode: currentMode === "tenant_isolation",
        tenant:
          currentMode === "tenant_isolation"
            ? {
                login_url: loginPath,
                identifier_selector: "input[name=email]",
                password_selector: "input[name=password]",
                submit_selector: "button[type=submit]",
                actor_a: { identifier: actorA, password: actorPasswordA },
                actor_b: { identifier: actorB, password: actorPasswordB },
                resource_paths: resourcePaths.split(",").map((p) => p.trim()).filter(Boolean),
              }
            : undefined,
      });
    },
    onSuccess: (result: any) => {
      toast.success("Audit queued");
      if (result?.id) {
        router.push(`/dashboard/scans/${result.id}`);
      } else {
        router.push("/dashboard/scans/history");
      }
    },
    onError: (error) => toast.error(error.message || "Could not start audit"),
  });

  if (isLoading) return <LoadingSkeleton />;

  if (!activeProject) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <EmptyState
          icon={Play}
          title="No project selected"
          description="Create a project to launch automated audits and penetration tests."
          actionLabel="Create project"
          actionHref="/dashboard/settings/project"
        />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        websiteUrl={activeProject.website_url}
        title="Run an audit"
        description="Launch a full multi-scanner audit or a targeted penetration test against your site."
        actions={
          <Button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || !isTargetConfigured || (needsAuth && !authorized)}
            className="bg-background-btn h-9 gap-1.5 px-5 text-sm font-medium text-white hover:brightness-95"
          >
            <Play className="size-3.5 fill-white" />
            {runMutation.isPending ? "Queueing…" : "Run scan"}
          </Button>
        }
      />

      {/* Target */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
              <Globe className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-slate-900">
                  {activeProject.name}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {target || "No website URL configured"}
              </p>
            </div>
          </div>

          <Input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Override target URL (optional)"
            className="h-8 max-w-xs border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-t-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
                active ? "text-rose-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
              {active && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-rose-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Standard audits */}
      {activeTab === "standard" && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {standardAuditPillars.map((item) => {
            const isSelected = selectedStandard === item.key;
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => setSelectedStandard(item.key)}
                className={cn(
                  "group flex flex-col justify-between rounded-xl border p-4 text-left transition-colors",
                  isSelected
                    ? "border-rose-200 bg-rose-50/40"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg transition-colors",
                        isSelected ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        isSelected ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="font-heading text-sm font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {item.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </section>
      )}

      {/* Tab 2: Active penetration tests */}
      {activeTab === "active" && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSecurityTests.map((item) => {
              const isSelected = selectedActive === item.key;
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setSelectedActive(item.key)}
                  className={cn(
                    "group flex flex-col justify-between rounded-xl border p-4 text-left transition-colors",
                    isSelected
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div>
                    <div className="mb-2.5 flex items-center justify-between">
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg transition-colors",
                          isSelected ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      {isSelected && <CheckCircle2 className="size-4 text-rose-500" />}
                    </div>
                    <h3 className="font-heading text-sm font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Options */}
          {["sql", "xss"].includes(selectedActive) && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Test options
              </h4>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includePost}
                    onChange={(e) => setIncludePost(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-rose-500 focus:ring-rose-200"
                  />
                  Test discovered forms (POST)
                </label>
                {selectedActive === "sql" && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeTimeBased}
                      onChange={(e) => setIncludeTimeBased(e.target.checked)}
                      className="size-4 rounded border-slate-300 text-rose-500 focus:ring-rose-200"
                    />
                    Include time-based injection probes
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Authorization */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
                className="mt-0.5 size-4 rounded border-amber-300 text-rose-500 focus:ring-rose-200"
              />
              <span className="text-xs leading-relaxed text-amber-900">
                I confirm that I have written permission to run active penetration tests against{" "}
                <span className="font-medium">{target}</span>.
              </span>
            </label>
          </div>
        </section>
      )}

      {/* Tab 3: Cloud & repository scans */}
      {activeTab === "integration" && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {integrationScans.map((item) => {
              const isSelected = selectedIntegration === item.key;
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setSelectedIntegration(item.key)}
                  className={cn(
                    "group flex flex-col justify-between rounded-xl border p-4 text-left transition-colors",
                    isSelected
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div>
                    <div className="mb-2.5 flex items-center justify-between">
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg transition-colors",
                          isSelected ? "bg-rose-400 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      {isSelected && <CheckCircle2 className="size-4 text-rose-500" />}
                    </div>
                    <h3 className="font-heading text-sm font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Repository & credentials
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Repository URL (e.g. https://github.com/org/repo)"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                className="h-9 border-slate-200 text-sm"
              />
              <Input
                type="password"
                placeholder="Access token (GitHub, Firebase, Vercel)"
                value={providerToken}
                onChange={(e) => setProviderToken(e.target.value)}
                className="h-9 border-slate-200 text-sm"
              />
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="flex flex-col justify-between gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
        <span className="flex items-center gap-2 text-xs text-slate-500">
          <Check className="size-3.5 text-emerald-500" />
          Ready to run for <span className="font-medium text-slate-700">{activeProject.name}</span> ({target})
        </span>
        <Button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending || !isTargetConfigured || (needsAuth && !authorized)}
          className="bg-background-btn h-9 gap-1.5 px-5 text-sm font-medium text-white hover:brightness-95"
        >
          <Play className="size-3.5 fill-white" />
          {runMutation.isPending ? "Queueing…" : "Run scan"}
        </Button>
      </div>
    </main>
  );
}