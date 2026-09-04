"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Shield, Search, Gauge, Accessibility } from "lucide-react";
import { SolutionItem } from "../types";
import { cn } from "@/lib/utils";

interface SolutionCardProps {
  solution: SolutionItem;
}

export default function SolutionCard({ solution }: SolutionCardProps) {
  const getIcon = () => {
    switch (solution.id) {
      case "security":
        return <Shield className="size-5 text-rose-600" strokeWidth={2} />;
      case "seo-aeo":
        return <Search className="size-5 text-rose-600" strokeWidth={2} />;
      case "performance":
        return <Gauge className="size-5 text-rose-600" strokeWidth={2} />;
      case "accessibility":
        return <Accessibility className="size-5 text-rose-600" strokeWidth={2} />;
      default:
        return <Shield className="size-5 text-rose-600" strokeWidth={2} />;
    }
  };

  return (
    <div
      className={cn(
        "solution-card group relative flex flex-col justify-between rounded-2xl bg-white p-7 sm:p-8 text-left",
        "border border-stone-200/90 transition-all duration-300 ease-out",
        "hover:border-stone-300 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.03)] hover:-translate-y-1",
        "min-h-[360px] overflow-hidden"
      )}
    >
      {/* Top subtle hairline glow on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/0 to-transparent group-hover:via-rose-500/50 transition-all duration-300" />

      {/* Main Content */}
      <div className="space-y-4">
        {/* Category Header with Icon & Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="size-10 rounded-xl bg-rose-50/80 border border-rose-100 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-rose-100/60 transition-transform duration-300">
            {getIcon()}
          </div>
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60">
            {solution.badge}
          </span>
        </div>

        {/* Title & Headline */}
        <div className="space-y-1.5 pt-1">
          <h3 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug group-hover:text-slate-950 transition-colors">
            {solution.title}
          </h3>
          <p className="font-content text-sm font-semibold text-slate-800">
            {solution.headline}
          </p>
        </div>

        {/* Description */}
        <p className="font-content text-sm text-slate-500 leading-relaxed line-clamp-3">
          {solution.description}
        </p>

        {/* Check highlights pill row */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {solution.checks.slice(0, 3).map((chk) => (
            <span
              key={chk.id}
              className="text-[11px] font-mono text-stone-500 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200/70"
            >
              ✓ {chk.title.split("&")[0].trim()}
            </span>
          ))}
          {solution.checks.length > 3 && (
            <span className="text-[11px] font-mono text-stone-400 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100">
              +{solution.checks.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Footer / CTA Link */}
      <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between">
        <span className="font-mono text-xs text-stone-400">
          {solution.checks.length} Automated Checks
        </span>

        <Link
          href={`/solutions/${solution.slug}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 group-hover:translate-x-0.5 transition-all cursor-pointer"
        >
          <span>Learn more</span>
          <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
