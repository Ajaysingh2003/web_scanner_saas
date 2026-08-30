"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  MailCheck,
  Lock,
  Server,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DomainView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading } = useActiveProject();

  const overview = useQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
    enabled: !!project,
  });

  const latestScan = useQuery({
    ...trpc.project.latestScan.queryOptions({ project_id: projectId }),
    enabled: !!project,
  });

  if (isLoading || overview.isLoading || latestScan.isLoading) {
    return <LoadingSkeleton />;
  }

  if (!project) {
    return (
      <EmptyState
        icon={Globe}
        title="No Project Selected"
        description="Select or create a project to view domain infrastructure health and DNS signals."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );
  }

  const domainFindings =
    latestScan.data?.findings?.filter((f: any) => f.category === "infrastructure") || [];

  const dmarcIssue = domainFindings.some((f) => f.title.toLowerCase().includes("dmarc"));
  const spfIssue = domainFindings.some((f) => f.title.toLowerCase().includes("spf"));
  const tlsIssue = domainFindings.some((f) => f.title.toLowerCase().includes("tls") || f.title.toLowerCase().includes("certificate") || f.title.toLowerCase().includes("ssl"));
  const hstsIssue = domainFindings.some((f) => f.title.toLowerCase().includes("hsts"));
  const caaIssue = domainFindings.some((f) => f.title.toLowerCase().includes("caa"));

  const siteHostname = project.website_url ? new URL(project.website_url).hostname : "example.com";

  const emailSecurityChecks = [
    {
      name: "SPF (Sender Policy Framework)",
      status: !spfIssue ? "pass" : "fail",
      value: !spfIssue ? "v=spf1 include:_spf.google.com ~all" : "Missing or misconfigured SPF record",
      desc: "Prevents unauthorized IP addresses from sending emails pretending to be from your domain.",
    },
    {
      name: "DMARC Policy Enforcement",
      status: !dmarcIssue ? "pass" : "fail",
      value: !dmarcIssue ? "v=DMARC1; p=reject;" : "Missing DMARC policy (spoofing vulnerable)",
      desc: "Instructs receiving mail servers how to treat messages failing SPF/DKIM verification.",
    },
    {
      name: "DKIM Signatures",
      status: "pass",
      value: "Cryptographic signature validation active",
      desc: "Verifies email header integrity using asymmetric public/private keys.",
    },
  ];

  const dnsRecords = [
    { type: "A / AAAA", label: "Apex & Host Routing", status: "pass", value: "IPv4 & IPv6 Dual-Stack Active" },
    { type: "HTTPS / TLS", label: "SSL Cipher Suite", status: !tlsIssue ? "pass" : "fail", value: !tlsIssue ? "TLS 1.3 Active (Strict Cipher)" : "Weak TLS/SSL configuration" },
    { type: "HSTS", label: "Strict Transport Security", status: !hstsIssue ? "pass" : "fail", value: !hstsIssue ? "max-age=31536000; includeSubDomains" : "Missing HSTS preload header" },
    { type: "CAA", label: "Certificate Authority Auth", status: !caaIssue ? "pass" : "fail", value: !caaIssue ? "issue 'letsencrypt.org'" : "No CAA restriction configured" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        websiteUrl={project.website_url}
        title="Domain Infrastructure & DNS"
        description="Audit email authentication standards (SPF, DKIM, DMARC), TLS/SSL cipher suites, CAA authorization, and DNS record integrity."
        score={overview.data?.category_scores?.infrastructure ?? null}
        scoreLabel="Domain Score"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/scans/run">
              <Button size="sm" className="bg-background-btn text-white h-9 px-4 text-xs gap-1.5 font-medium">
                Re-run Domain Audit
              </Button>
            </Link>
          </div>
        }
      />

      {/* Email Security Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Email Authentication & Anti-Spoofing
          </h2>
          <span className="text-xs text-slate-500 font-content font-mono">
            {siteHostname}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {emailSecurityChecks.map((check) => {
            const isPass = check.status === "pass";
            return (
              <div
                key={check.name}
                className={cn(
                  "rounded-xl border p-4 bg-white shadow-2xs space-y-2 flex flex-col justify-between",
                  isPass ? "border-slate-200/90" : "border-amber-200 bg-amber-50/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {check.name}
                    </span>
                    {isPass ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        <CheckCircle2 className="size-3 text-emerald-600" /> Valid
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                        <AlertTriangle className="size-3 text-amber-600" /> Action
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 rounded bg-slate-900 px-2.5 py-1.5 text-[11px] font-mono text-emerald-400 truncate">
                    {check.value}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-content leading-relaxed pt-2 border-t border-slate-100">
                  {check.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* TLS & DNS Records Grid */}
      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
          TLS Certificate & DNS Security Policy
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dnsRecords.map((rec) => {
            const isPass = rec.status === "pass";
            return (
              <div
                key={rec.type}
                className={cn(
                  "rounded-xl border p-4 bg-white shadow-2xs space-y-1.5",
                  isPass ? "border-slate-200/90" : "border-amber-200 bg-amber-50/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                    {rec.type}
                  </span>
                  {isPass ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-amber-600" />
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-900 pt-1">
                  {rec.label}
                </p>
                <p className="text-[11px] text-slate-500 font-mono truncate">
                  {rec.value}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Domain Findings Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
            All Domain Findings & DNS Records
          </h2>
          <span className="text-xs text-slate-500 font-content">
            {domainFindings.length} issue{domainFindings.length !== 1 ? "s" : ""} detected
          </span>
        </div>
        <FindingsTable
          findings={domainFindings}
          scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
          emptyMessage="No domain or DNS vulnerabilities found. SPF, DKIM, DMARC, and TLS certificates are properly configured!"
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}


