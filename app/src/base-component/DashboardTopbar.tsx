"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Globe2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useActiveProject } from "@/hooks/useActiveProject";

const sectionLabels: Record<string, string> = {
  dashboard: "Overview",
  scans: "Scans",
  security: "Security",
  seo: "SEO",
  aeo: "AEO",
  performance: "Performance",
  domain: "Domain",
  compliance: "Compliance",
  accessibility: "Accessibility",
  threats: "Live threats",
  monitoring: "Monitoring",
  uptime: "Uptime",
  connections: "Connections",
  history: "History",
  reports: "Reports",
  roi: "ROI & revenue risk",
  benchmarks: "Competitor benchmarks",
  settings: "Settings",
  account: "Account",
  billing: "Billing",
};

function currentSection(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[1] === "settings") return parts[2] || "settings";
  return parts[1] || "dashboard";
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const { project, projects, setActiveProject } = useActiveProject();
  const section = currentSection(pathname);
  const sectionLabel = sectionLabels[section] || "Workspace";
  const isOverview = section === "dashboard";

  return (
    <header className="sticky h-15 md:h-18 top-0 z-30 flex min-h-14 w-full items-center border-b border-slate-200/80 bg-white/45 px-3 backdrop-blur sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <SidebarToggle />
        <Separator orientation="vertical" className="hidden h-5 sm:block" />

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link
            href="/dashboard"
            className="hidden shrink-0 font-medium text-slate-500 transition-colors hover:text-slate-900 sm:inline"
          >
            Workspace
          </Link>
          <span className="hidden text-slate-300 sm:inline">/</span>
          {project && (
            <>
              <span className="max-w-[8rem] truncate font-medium text-slate-700 sm:max-w-[12rem]">
                {project.name}
              </span>
              <span className="text-slate-300">/</span>
            </>
          )}
          <span className="truncate font-semibold text-slate-950">{sectionLabel}</span>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* <div className="hidden items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 md:flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          All systems operational
        </div> */}

       

        {!isOverview && (
          <Link
            href="/dashboard"
            className="hidden text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 lg:inline"
          >
            Back to overview
          </Link>
        )}
      </div>
    </header>
  );
}

function SidebarToggle() {
  return <SidebarTrigger className="size-9 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-950" />;
}
