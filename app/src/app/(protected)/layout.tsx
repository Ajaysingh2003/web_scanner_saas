import React, { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/base-component/AppSidebar";
import { DashboardTopbar } from "@/base-component/DashboardTopbar";
import { ProjectProvider } from "@/context/ProjectContext";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import DashboardPageSkeleton from "@/modules/dashboard/component/DashboardPageSkeleton";
import { cookies } from "next/headers";
import type { Project } from "@/modules/project/types";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SessionKeeper from "@/modules/user/component/SessionKeeper";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true, nosnippet: true } };

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.get("access_token")?.value) {
    redirect("/login?next=/dashboard");
  }

  const queryClient = getQueryClient();
  try {
    await queryClient.fetchQuery(trpc.user.me.queryOptions());
  } catch {
    redirect("/login?next=/dashboard&reason=session_expired");
  }

  const projects = await queryClient.fetchQuery(trpc.project.list.queryOptions()) as Project[];
  const selectedProjectId = cookieStore.get("scanlyst_active_project_id")?.value;
  const activeProjectId = projects.find((project) => project.id === selectedProjectId)?.id ?? projects[0]?.id;

  const preloads = [
    queryClient.prefetchQuery(trpc.project.billingAccount.queryOptions()),
    queryClient.prefetchQuery(trpc.user.profile.queryOptions()),
    queryClient.prefetchQuery(trpc.user.listApiKeys.queryOptions()),
    queryClient.prefetchQuery(trpc.billing.getPlans.queryOptions()),
  ];
  if (activeProjectId) {
    preloads.push(
      queryClient.prefetchQuery(trpc.project.overview.queryOptions({ project_id: activeProjectId })),
      queryClient.prefetchQuery(trpc.project.scanHistory.queryOptions({ project_id: activeProjectId })),
      queryClient.prefetchQuery(trpc.project.schedule.queryOptions({ project_id: activeProjectId })),
      queryClient.prefetchQuery(trpc.project.activity.queryOptions({ project_id: activeProjectId })),
      queryClient.prefetchQuery(trpc.project.providerConnections.queryOptions({ project_id: activeProjectId })),
      queryClient.prefetchQuery(trpc.project.webhooks.queryOptions({ project_id: activeProjectId })),
      queryClient.prefetchQuery(trpc.project.benchmarks.queryOptions({ project_id: activeProjectId })),
      queryClient.prefetchQuery(trpc.project.roi.queryOptions({ project_id: activeProjectId })),
    );
  }
  await Promise.allSettled(preloads);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectProvider initialProjectId={activeProjectId}>
        <SessionKeeper />
        <SidebarProvider>
          <AppSidebar />
          <main className="min-h-svh min-w-0 flex-1 bg-[#f5f5f5]">
            <DashboardTopbar />
            <Suspense fallback={<DashboardPageSkeleton />}>
              {children}
            </Suspense>
          </main>
        </SidebarProvider>
      </ProjectProvider>
    </HydrationBoundary>
  );
}
