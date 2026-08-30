"use client";

import Link from "next/link";
import { type LucideIcon, Globe } from "lucide-react";

interface PageHeaderProps {
  websiteUrl?: string;
  title: string;
  description: string;
  score?: number | null;
  scoreLabel?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
}

export default function PageHeader({
  websiteUrl,
  title,
  description,
  score,
  scoreLabel = "Current score",
  actions,
  icon: Icon,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-5">
      <div className="space-y-1.5 max-w-3xl">
        {websiteUrl && (
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-content mb-0.5">
            <Globe className="size-3.5 text-slate-400" />
            <span className="font-medium text-slate-700">{websiteUrl}</span>
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="size-6 text-[#f43f5e] shrink-0" />}
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>
        </div>
        <p className="font-content text-xs sm:text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-4 shrink-0 pt-1">
        {score != null && (
          <div className="text-right border-r border-slate-200 pr-4 mr-1">
            <p className="font-content text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {scoreLabel}
            </p>
            <p className="font-heading text-3xl sm:text-4xl font-bold text-slate-950">
              {Math.round(score)}
              <span className="font-content text-xs font-normal text-slate-400">
                /100
              </span>
            </p>
          </div>
        )}
        {actions}
      </div>
    </header>
  );
}
