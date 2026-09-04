"use client";

import React from "react";
import { ShieldCheck, Award } from "lucide-react";
import { SolutionItem } from "../types";

interface SolutionTrustSectionProps {
  solution: SolutionItem;
}

export default function SolutionTrustSection({ solution }: SolutionTrustSectionProps) {
  return (
    <div className="solution-trust-section space-y-8">
      {/* Section Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-rose-600">
          <ShieldCheck className="size-3.5" />
          <span>STANDARDS & COMPLIANCE ALIGNMENT</span>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
          {solution.standardsHeading}
        </h2>
        <p className="font-content text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          {solution.standardsDescription}
        </p>
      </div>

      {/* Grid of 4 Standards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {solution.standards.map((std) => (
          <div
            key={std.code}
            className="solution-trust-card p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3 hover:border-stone-300 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="size-4 text-rose-600 shrink-0" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                  {std.code}
                </span>
              </div>

              <span className="font-mono text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                {std.complianceLevel}
              </span>
            </div>

            <h3 className="font-heading text-base font-bold text-slate-900">
              {std.name}
            </h3>

            <p className="font-content text-xs sm:text-sm text-slate-500 leading-relaxed">
              {std.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
