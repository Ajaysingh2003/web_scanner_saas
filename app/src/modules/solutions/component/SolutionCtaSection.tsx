"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useAuthScanAction } from "@/modules/product/hooks/useAuthScanAction";

interface SolutionCtaSectionProps {
  title: string;
  description: string;
}

export default function SolutionCtaSection({ title, description }: SolutionCtaSectionProps) {
  const { handleScanClick } = useAuthScanAction();

  return (
    <div className="solution-cta-section relative overflow-hidden rounded-3xl border border-stone-200/90 bg-[#fafafa] p-8 sm:p-14 text-center">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-500/5 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-2xl space-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-white px-3 py-1 text-xs font-mono text-rose-700 shadow-2xs">
          <Sparkles className="size-3.5" />
          <span>PRODUCTION-READY AUDIT ENGINE</span>
        </div>

        {/* Title */}
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-950">
          {title}
        </h2>

        {/* Description */}
        <p className="font-content text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
          {description}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleScanClick()}
            className="bg-background-btn inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold shadow-xs hover:shadow-sm hover:opacity-95 transition-all cursor-pointer w-full sm:w-auto"
          >
            <span>Run Free Website Audit</span>
            <ArrowRight className="size-4" />
          </button>

          <Link
            href="/solutions"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors shadow-2xs cursor-pointer w-full sm:w-auto"
          >
            <span>Explore All Solutions</span>
          </Link>
        </div>

        {/* Reassurance text */}
        <div className="flex items-center justify-center gap-4 pt-2 text-[11px] font-mono text-stone-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Non-destructive test</span>
          </span>
          <span>•</span>
          <span>Zero credentials required</span>
          <span>•</span>
          <span>Instant results</span>
        </div>
      </div>
    </div>
  );
}
