"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarClock, GitCompareArrows, ListChecks, Play } from "lucide-react";

const links = [
  ["/dashboard/scans", "Overview", Activity],
  ["/dashboard/scans/run", "Run a scan", Play],
  ["/dashboard/scans/history", "History", ListChecks],
  ["/dashboard/scans/schedules", "Schedules", CalendarClock],
  ["/dashboard/scans/compare", "Compare", GitCompareArrows],
] as const;


export default function ScanShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-[calc(100svh-3rem)] flex-col md:flex-row bg-[#fafafa]">
      {/* <aside className="w-full border-b border-black/5 bg-white px-4 py-3 md:w-52 md:border-b-0 md:border-r md:px-3 md:py-6">
        <p className="px-2 font-content text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Scans</p>
        <nav className="mt-3 space-y-1">
          {links.map(([href, label, Icon]) => {
            const active = href === "/dashboard/scans" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 font-content text-[13px] transition ${active ? "bg-rose-50/70 font-medium text-slate-900 before:absolute before:-left-3 before:h-5 before:w-0.5 before:rounded-full before:bg-[#f43f5e]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><Icon className={`size-3.5 ${active ? "text-[#f43f5e]" : "text-slate-400"}`} />{label}</Link>;
          })}
        </nav>
      </aside> */}
      <main className="min-w-0 flex-1 bg-[#fafafa]">{children}</main>
    </div>
  );
}
