"use client";

import Link from "next/link";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  Lock,
  Terminal,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";

export default function SecurityOverviewView() {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const { project, projectId, isLoading } = useActiveProject();

  const overview = useSuspenseQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
  });

  const latestScan = useQuery({
    ...trpc.project.latestScan.queryOptions({ project_id: projectId }),
    enabled: !!project,
  });

  const runSqlInjection = useMutation({
    mutationFn: () =>
      trpcClient.project.runSqlInjection.mutate({
        project_id: projectId,
        authorized: true,
        include_post_requests: true,
        include_time_based: true,
        max_pages: 15,
      }),
    onSuccess: () => {
      toast.success("SQL injection test started");
      queryClient.invalidateQueries();
    },
    onError: (err) => toast.error(err.message),
  });

  const runXss = useMutation({
    mutationFn: () =>
      trpcClient.project.runXss.mutate({
        project_id: projectId,
        authorized: true,
        include_post_requests: true,
        max_pages: 15,
      }),
    onSuccess: () => {
      toast.success("XSS test started");
      queryClient.invalidateQueries();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || overview.isLoading || latestScan.isLoading) {
    return <LoadingSkeleton />;
  }

  if (!project) {
    return (
      <EmptyState
        icon={Shield}
        title="No project selected"
        description="Select or create a project to view its security posture and run active tests."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );
  }

  const allFindings = latestScan.data?.findings || [];
  const securityFindings = allFindings.filter((f: any) =>
    ["vulnerability", "configuration", "security", "threat"].includes(f.category)
  );

  const critCount = securityFindings.filter((f) => f.severity === "critical").length;
  const highCount = securityFindings.filter((f) => f.severity === "high").length;
  const medCount = securityFindings.filter((f) => f.severity === "medium").length;
  const lowCount = securityFindings.filter((f) => ["low", "info"].includes(f.severity)).length;

  const headerChecks = [
    { name: "Content-Security-Policy", desc: "Prevents unauthorized script injection and clickjacking" },
    { name: "Strict-Transport-Security", desc: "Forces encrypted HTTPS connections across subdomains" },
    { name: "X-Content-Type-Options", desc: "Prevents MIME-type sniffing attacks" },
    { name: "X-Frame-Options", desc: "Guards against iframe-based clickjacking" },
    { name: "Referrer-Policy", desc: "Protects user URL tokens from external referrer leaks" },
    { name: "Permissions-Policy", desc: "Restricts camera, microphone, and geolocation access" },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        websiteUrl={project.website_url}
        title="Security"
        description="Continuous OWASP top 10 auditing, security header checks, exposed secret detection, and on-demand penetration tests."
        score={overview.data?.category_scores?.vulnerability ?? null}
        scoreLabel="Security score"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/security/headers">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-200 text-xs text-slate-600">
                <Lock className="size-3.5 text-slate-400" />
                Security headers
              </Button>
            </Link>
            <Link href="/dashboard/scans/run">
              <Button size="sm" className="bg-background-btn h-9 px-4 text-xs font-medium text-white hover:brightness-95">
                Run security scan
              </Button>
            </Link>
          </div>
        }
      />

      {/* Severity summary */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Critical</span>
            <ShieldAlert className="size-4 text-rose-500" />
          </div>
          <p className="font-heading text-2xl font-semibold text-slate-900">{critCount}</p>
          <p className="text-xs text-slate-400">Immediate exploit potential</p>
        </div>

        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">High</span>
            <AlertTriangle className="size-4 text-amber-500" />
          </div>
          <p className="font-heading text-2xl font-semibold text-slate-900">{highCount}</p>
          <p className="text-xs text-slate-400">Significant configuration risk</p>
        </div>

        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Medium</span>
            <Shield className="size-4 text-amber-400" />
          </div>
          <p className="font-heading text-2xl font-semibold text-slate-900">{medCount}</p>
          <p className="text-xs text-slate-400">Hardening & defense in depth</p>
        </div>

        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Low & info</span>
            <CheckCircle2 className="size-4 text-slate-400" />
          </div>
          <p className="font-heading text-2xl font-semibold text-slate-900">{lowCount}</p>
          <p className="text-xs text-slate-400">Informational advisories</p>
        </div>
      </section>

      {/* Active tests */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Active penetration tests</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <Terminal className="size-3.5" />
                </span>
                <h3 className="font-heading text-sm font-semibold text-slate-900">
                  SQL injection probe
                </h3>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Tests discovered inputs and forms on {project.website_url || "the target"} with
                boolean-blind, error-based, and time-delayed probes.
              </p>
            </div>
            <Button
              onClick={() => runSqlInjection.mutate()}
              disabled={runSqlInjection.isPending}
              className="bg-background-btn h-8 w-full text-xs font-medium text-white hover:brightness-95"
            >
              {runSqlInjection.isPending ? "Running…" : "Run SQL injection test"}
            </Button>
          </div>

          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <Zap className="size-3.5" />
                </span>
                <h3 className="font-heading text-sm font-semibold text-slate-900">
                  Active XSS probe
                </h3>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Runs an isolated headless browser to test DOM fragments, query parameters, and
                forms for reflected or stored XSS.
              </p>
            </div>
            <Button
              onClick={() => runXss.mutate()}
              disabled={runXss.isPending}
              className="bg-background-btn h-8 w-full text-xs font-medium text-white hover:brightness-95"
            >
              {runXss.isPending ? "Running…" : "Run active XSS test"}
            </Button>
          </div>
        </div>
      </section>

      {/* Header checklist */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">HTTP security headers</h2>
          <Link
            href="/dashboard/security/headers"
            className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
          >
            Configure headers <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {headerChecks.map((header) => (
            <div key={header.name} className="space-y-1 rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-slate-800">{header.name}</span>
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
              </div>
              <p className="text-xs leading-relaxed text-slate-500">{header.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Findings */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Findings</h2>
          <span className="text-xs text-slate-400">
            {securityFindings.length} issue{securityFindings.length !== 1 ? "s" : ""}
          </span>
        </div>
        <FindingsTable
          findings={securityFindings}
          scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
          emptyMessage="No security issues found. Your headers, TLS configuration, and input surfaces look solid."
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}
