"use client";

import React from "react";
import { ShieldCheck, Zap, Bot, RefreshCw } from "lucide-react";

export default function ProductStatsBanner() {
  const stats = [
    {
      icon: ShieldCheck,
      value: "41",
      label: "Dedicated Scanners",
      desc: "Full coverage across OWASP A01-A10, DNS, BaaS, and SEO.",
    },
    {
      icon: Zap,
      value: "200+",
      label: "Automated Checks",
      desc: "Every observable header, cipher, endpoint, and script tested.",
    },
    {
      icon: RefreshCw,
      value: "<45s",
      label: "Full Scan Time",
      desc: "Asynchronous multi-vector pipeline with zero site downtime.",
    },
    {
      icon: Bot,
      value: "100%",
      label: "AI-Ready Prompts",
      desc: "Instant one-click copy prompts for Cursor, Claude, and Copilot.",
    },
  ];

  return (
    <div className="w-full md:py-12 border-t border-b border-stone-200/80 bg-white">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-stone-100 bg-[#fbfbfa] space-y-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <stat.icon className="size-4 text-rose-500" />
              <span className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-950">
                {stat.value}
              </span>
            </div>
            <div>
              <h4 className="font-heading text-xs sm:text-sm font-bold text-slate-900">
                {stat.label}
              </h4>
              <p className="font-content text-xs text-slate-500 mt-0.5 leading-relaxed">
                {stat.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
