"use client";

import Link from "next/link";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  FileCheck2,
  Shield,
  Cookie,
  FileText,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
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



export default function ComplianceView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading } = useActiveProject();

  const overview = useSuspenseQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
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
        icon={Scale}
        title="No Project Selected"
        description="Select or create a project to view compliance signals and privacy indicators."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );
  }

  const complianceFindings =
    latestScan.data?.findings?.filter((f: any) => f.category === "compliance") || [];

  const privacyIssue = complianceFindings.some((f) => f.title.toLowerCase().includes("privacy"));
  const cookieIssue = complianceFindings.some((f) => f.title.toLowerCase().includes("cookie") || f.title.toLowerCase().includes("consent"));
  const termsIssue = complianceFindings.some((f) => f.title.toLowerCase().includes("terms"));
  const sriIssue = complianceFindings.some((f) => f.title.toLowerCase().includes("sri") || f.title.toLowerCase().includes("integrity"));

  const regulations = [
    {
      name: "Privacy Policy Page",
      status: !privacyIssue ? "pass" : "fail",
      detail: !privacyIssue ? "Linked in footer and publicly accessible" : "Missing or unreachable privacy policy",
      icon: FileText,
    },
    {
      name: "Cookie Consent Banner (GDPR/ePrivacy)",
      status: !cookieIssue ? "pass" : "fail",
      detail: !cookieIssue ? "Cookie governance mechanism active" : "Missing explicit cookie consent banner",
      icon: Cookie,
    },
    {
      name: "Terms of Service Agreement",
      status: !termsIssue ? "pass" : "fail",
      detail: !termsIssue ? "Terms of service page detected" : "Missing terms of service link",
      icon: FileCheck2,
    },
    {
      name: "Subresource Integrity (SRI)",
      status: !sriIssue ? "pass" : "fail",
      detail: !sriIssue ? "External CDN scripts verified with hash" : "Third-party scripts loaded without integrity hash",
      icon: Lock,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        websiteUrl={project.website_url}
        title="Privacy & Regulatory Compliance"
        description="Audit user privacy disclosures, GDPR/CCPA cookie consent mechanisms, Terms of Service reachability, and Subresource Integrity."
        score={overview.data?.category_scores?.compliance ?? null}
        scoreLabel="Compliance Score"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/scans/run">
              <Button size="sm" className="bg-background-btn text-white h-9 px-4 text-xs gap-1.5 font-medium">
                Re-run Compliance Audit
              </Button>
            </Link>
          </div>
        }
      />

      {/* Legal Disclaimer Note */}

      <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 flex items-start gap-2.5 text-blue-900">
        <Info className="size-4 shrink-0 mt-0.5 text-blue-600" />
        <p className="text-xs leading-relaxed font-content">
          <strong>Compliance Disclaimer:</strong> These automated checks evaluate technical web signals (consent banners, policy links, script integrity). They serve as operational guidance and do not replace formal legal certification.
        </p>
      </div>

      {/* Regulatory Governance Cards */}
      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
          Privacy Policy & Consent Governance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {regulations.map((item) => {
            const Icon = item.icon;
            const isPass = item.status === "pass";
            return (
              <div
                key={item.name}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 bg-white shadow-2xs",
                  isPass ? "border-slate-200/90" : "border-amber-200 bg-amber-50/20"
                )}
              >
                <span className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
                  isPass ? "bg-emerald-50 text-emerald-600" : "bg-amber-100 text-amber-700"
                )}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      {item.name}
                    </span>
                    {isPass ? (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Compliant
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Missing
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-content leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Compliance Findings Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
            All Compliance Findings & Privacy Remediations
          </h2>
          <span className="text-xs text-slate-500 font-content">
            {complianceFindings.length} issue{complianceFindings.length !== 1 ? "s" : ""} detected
          </span>
        </div>
        <FindingsTable
          findings={complianceFindings}
          scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
          emptyMessage="No privacy or compliance defects detected. Your privacy policy, consent banners, and script integrity are in order!"
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}

