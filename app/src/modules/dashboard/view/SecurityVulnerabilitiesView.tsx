"use client";

import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SecurityVulnerabilitiesView() {
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
        icon={AlertTriangle}
        title="No Project Selected"
        description="Select or create a project to view vulnerabilities."
      />
    );
  }

  const riskKeywords = ["xss", "csrf", "sqli", "cors", "jwt", "graphql", "idor", "cookie", "debug", "api key"];
  
  const findings = latestScan.data?.findings?.filter((f: any) => {
    if (f.category !== "security") return false;
    const searchString = `${f.title} ${f.description}`.toLowerCase();
    return riskKeywords.some(keyword => searchString.includes(keyword));
  }) || [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <PageHeader
        title="Application Risks"
        description="Detailed findings for XSS, CSRF, SQLi, CORS misconfigurations, and other application-level vulnerabilities."
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
          emptyMessage="No application risks detected in the latest scan."
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}


