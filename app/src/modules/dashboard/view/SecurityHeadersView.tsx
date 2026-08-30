"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SecurityHeadersView() {
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
        icon={AlertTriangle}
        title="No Project Selected"
        description="Select or create a project to view headers & TLS."
      />
    );
  }

  const findings = latestScan.data?.findings?.filter((f: any) => 
    f.category === "security" && 
    (f.scanner_name?.toLowerCase().includes("header") || 
     f.title.toLowerCase().includes("tls") ||
     f.title.toLowerCase().includes("hsts") ||
     f.title.toLowerCase().includes("csp") ||
     f.title.toLowerCase().includes("sri") ||
     f.title.toLowerCase().includes("mixed content"))
  ) || [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <PageHeader
        title="Security Headers & TLS"
        description="Audit results for HTTP security headers, TLS configuration, and transport layer protections."
        score={overview.data?.category_scores?.vulnerability ?? null}
        scoreLabel="Security score"
        actions={
          <Link href="/dashboard/scans">
            <Button variant="outline">View scan report</Button>
          </Link>
        }
      />

      <section className="space-y-3">
        <FindingsTable
          findings={findings}
          scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
          emptyMessage="No header or TLS misconfigurations found."
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}



