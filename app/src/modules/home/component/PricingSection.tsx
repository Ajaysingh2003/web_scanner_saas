"use client";

import React from "react";
import PricingTable from "@/modules/billing/component/PricingTable";

export default function PricingSection() {
  return (
    <section className="w-full py-20 md:py-28 bg-white border-t border-stone-200/80">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        <div className="mb-12 md:mb-16 text-center max-w-2xl mx-auto">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-slate-700 uppercase shadow-xs backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]" />
            Simple & Transparent Pricing
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-[1.18]">
            <span className="tc-mask-child block">Scan for free. </span>

            <span className="tc-mask-child block italic font-medium font-serif bg-gradient-to-r from-rose-400 to-white/70 bg-clip-text text-transparent">
              Pay when you need it watched.
            </span>
          </h2>

          <p className="font-content text-base text-slate-600 mt-2 leading-relaxed">
            Start free, inspect your attack surface, and scale monitoring as
            your infrastructure grows.
          </p>
        </div>

        <PricingTable />
      </div>
    </section>
  );
}
