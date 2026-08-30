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

export default function SeoAeoView() {
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
        description="Select or create a project to view SEO & AEO findings."
      />
    );
  }

  const seoFindings = latestScan.data?.findings?.filter((f: any) => f.category === "seo") || [];
  const aeoFindings = latestScan.data?.findings?.filter((f: any) => f.category === "aeo") || [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="SEO & AEO Insights"
        description="Search Engine Optimization and Answer Engine Optimization analysis for your application."
        score={overview.data?.category_scores?.seo ?? null}
        scoreLabel="SEO score"
        actions={
          <Link href="/dashboard/scans">
            <Button variant="outline">View scan report</Button>
          </Link>
        }
      />

      <div className="mt-8 space-y-12">
        <section>
          <h2 className="mb-4 font-heading text-xl text-slate-900">Search Engine Optimization (SEO)</h2>
          <FindingsTable
            findings={seoFindings}
            scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
            emptyMessage="No SEO findings reported."
          />
        </section>

        <section>
          <h2 className="mb-4 font-heading text-xl text-slate-900">Answer Engine Optimization (AEO)</h2>
          <FindingsTable
            findings={aeoFindings}
            scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
            emptyMessage="No AEO findings reported."
          />
        </section>

      </div>
    </main>
  );
}
