"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuthScanAction } from "../hooks/useAuthScanAction";

export default function ProductCtaSection() {
  const { handleScanClick } = useAuthScanAction();

  return (
    <div className="w-full py-16 sm:py-20 text-center space-y-6 rounded-3xl border border-stone-200/90 bg-[#fbfbfa] p-8 sm:p-12 relative overflow-hidden shadow-2xs">
      {/* Background subtle radial gradient */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 rounded-full bg-rose-100/40 blur-3xl" />

      <div className="relative z-10 max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 shadow-2xs">
          <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
          START WITH A SINGLE URL
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950 leading-tight">
          Ready to audit your attack surface?
        </h2>

        <p className="font-content text-sm sm:text-base text-slate-600 leading-relaxed">
          Run all 41 scanners across your public endpoints in under 45 seconds. Receive full evidence,
          threat severity rankings, and AI-ready patches.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handleScanClick()}
            className="bg-background-btn inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold shadow-xs hover:shadow-sm hover:opacity-95 transition-all cursor-pointer"
          >
            <span>Run Free Website Audit</span>
            <ArrowRight className="size-4" />
          </button>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-slate-800 transition-colors shadow-2xs cursor-pointer"
          >
            <span>Compare Pricing Plans</span>
          </Link>
        </div>

        {/* Safeguards Badges */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>100% Passive Probing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>Zero Downtime Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>Instant One-Click AI Prompts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
