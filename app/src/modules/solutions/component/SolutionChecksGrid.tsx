"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";
import { SolutionItem } from "../types";
import { cn } from "@/lib/utils";

interface SolutionChecksGridProps {
  solution: SolutionItem;
}

export default function SolutionChecksGrid({ solution }: SolutionChecksGridProps) {
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border-orange-200/80";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "OPTIMAL":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200/80";
    }
  };

  return (
    <div className="solution-checks-section space-y-8">
      {/* Section Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-rose-600">
          <CheckCircle2 className="size-3.5" />
          <span>COVERAGE MATRIX</span>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
          {solution.checksHeading}
        </h2>
        <p className="font-content text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          {solution.checksDescription}
        </p>
      </div>

      {/* Grid of Sub-Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {solution.checks.map((check) => (
          <div
            key={check.id}
            className={cn(
              "solution-check-card group relative flex flex-col justify-between rounded-2xl bg-white p-6 text-left",
              "border border-stone-200/90 transition-all duration-200 ease-out",
              "hover:border-stone-300 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.02)] hover:-translate-y-0.5"
            )}
          >
            <div className="space-y-3">
              {/* Badges row */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                    getSeverityBadge(check.severityOrImpact)
                  )}
                >
                  {check.severityOrImpact}
                </span>

                <span className="text-[10.5px] font-mono text-stone-400 bg-stone-50 px-2 py-0.5 rounded border border-stone-100">
                  {check.tag}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 leading-snug group-hover:text-slate-950 transition-colors">
                {check.title}
              </h3>

              {/* Description */}
              <p className="font-content text-xs sm:text-sm text-slate-500 leading-relaxed">
                {check.description}
              </p>
            </div>

            {/* Bottom link to dedicated scan dossier if available */}
            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs">
              {check.scanSlug ? (
                <Link
                  href={`/scans/${check.scanSlug}`}
                  className="inline-flex items-center gap-1 font-mono font-semibold text-rose-600 hover:text-rose-700 transition-colors group-hover:translate-x-0.5 cursor-pointer"
                >
                  <span>View scan dossier</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              ) : (
                <span className="text-[11px] font-mono text-stone-400">
                  Automated Engine Rule
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
