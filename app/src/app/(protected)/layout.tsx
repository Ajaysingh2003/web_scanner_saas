import React, { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/base-component/AppSidebar";
import { DashboardTopbar } from "@/base-component/DashboardTopbar";
import { ProjectProvider } from "@/context/ProjectContext";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="min-h-svh min-w-0 flex-1 bg-[#f5f5f5]">
          <DashboardTopbar />
          <Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading...</div>}>
            {children}
          </Suspense>
        </main>
      </SidebarProvider>
    </ProjectProvider>
  );
}
