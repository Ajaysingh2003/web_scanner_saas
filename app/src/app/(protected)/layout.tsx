import React, { Suspense } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/base-component/AppSidebar";
import { ProjectProvider } from "@/context/ProjectContext";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="min-h-svh min-w-0 flex-1 bg-[#f5f5f5]">
          <div className="flex h-12 items-center border-b border-slate-200 bg-white px-4">
            <SidebarTrigger />
          </div>
          <Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading...</div>}>
            {children}
          </Suspense>
        </main>
      </SidebarProvider>
    </ProjectProvider>
  );
}
