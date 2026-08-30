"use client";

import React from "react";
import { Search, ShieldCheck, AlertCircle, Globe, Database, Zap } from "lucide-react";

interface SearchBugsProps {
  searchRef: React.RefObject<HTMLParagraphElement | null>;
  searchCard: React.RefObject<HTMLDivElement | null>;
  extraContentRef: React.RefObject<HTMLDivElement | null>;
  hover: boolean;
}

interface ScanStatus {
  id: string;
  label: string;
  icon: React.ReactNode;
  badgeColor: string;    // now uses warm colors
  issuesFound: number;
}

const SCAN_STATUSES: ScanStatus[] = [
  {
    id: "headers",
    label: "Headers & TLS",
    icon: <Globe className="h-3 w-3" />,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    issuesFound: 0,
  },
  {
    id: "cors",
    label: "CORS & DB configs",
    icon: <Database className="h-3 w-3" />,
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    issuesFound: 2,
  },
  {
    id: "threats",
    label: "Threat definitions",
    icon: <Zap className="h-3 w-3" />,
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    issuesFound: 1,
  },
];

const TOTAL_ISSUES = SCAN_STATUSES.reduce((sum, s) => sum + s.issuesFound, 0);

function SearchBugs({ searchRef, searchCard, extraContentRef, hover }: SearchBugsProps) {
  return (
    <div className="w-full max-w-sm">
      <div
        ref={searchCard}
        className="group relative w-full shadow-sm overflow-hidden rounded-full  bg-white transition-all"
        style={{
          // boxShadow: "0 4px 12px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05)",
          
        }}
      >
        {/* Input row – accent is now amber/rust */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <p
              ref={searchRef}
              className="truncate font-mono text-sm font-medium tracking-wider text-slate-600"
            >
              Enter a URL...
            </p>
          </div>

          <button
            type="button"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm transition-all hover:scale-105 hover:bg-rose-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-300"
            aria-label="Run search"
          >
            <Search className="relative z-10 h-4 w-4" />
          </button>
        </div>

        {/* Expandable status panel */}
        <div
          ref={extraContentRef}
          className={`space-y-2 overflow-hidden px-4 ${hover ? "pb-4" : ""}`}
        >
          <div className="h-px w-full bg-slate-200/60" />

          {SCAN_STATUSES.map((status) => (
            <div
              key={status.id}
              className="extra-p-tag flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50/80"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                  {status.icon}
                </span>
                <span className="tracking-wide">{status.label}</span>
              </span>

              {status.issuesFound > 0 ? (
                <span
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.badgeColor}`}
                >
                  <AlertCircle className="h-3 w-3" />
                  {status.issuesFound}
                </span>
              ) : (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                  Clear
                </span>
              )}
            </div>
          ))}


          <div className="extra-summary-row mt-3 flex items-center justify-between rounded-xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              {TOTAL_ISSUES > 0 ? (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              )}
              {TOTAL_ISSUES > 0
                ? `${TOTAL_ISSUES} issue${TOTAL_ISSUES > 1 ? "s" : ""} detected`
                : "All systems clear"}
            </span>
            <span className="font-mono text-[10px] text-slate-400">⏱ 2.4s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SearchBugs;

