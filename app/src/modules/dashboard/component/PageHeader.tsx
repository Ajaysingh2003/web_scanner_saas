"use client";

import React, { useState } from "react";
import Image from "next/image";
import { type LucideIcon, Globe, ArrowUpRight } from "lucide-react";

interface PageHeaderProps {
  websiteUrl?: string;
  title: string;
  description: string;
  score?: number | null;
  scoreLabel?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
}

function HeaderFavicon({ url }: { url: string }) {
  const [hasError, setHasError] = useState(false);

  let hostname = "";
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    hostname = new URL(normalized).hostname;
  } catch {
    hostname = url;
  }

  const faviconSrc = hostname
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
    : null;

  if (!faviconSrc || hasError) {
    return <Globe className="size-3 text-slate-400 shrink-0" />;
  }

  return (
    <div className="relative size-3.5 shrink-0 overflow-hidden rounded-xs">
      <Image
        src={faviconSrc}
        alt=""
        fill
        sizes="14px"
        className="object-contain"
        onError={() => setHasError(true)}
        unoptimized
      />
    </div>
  );
}

function getScoreTier(score: number) {
  if (score >= 90) {
    return {
      status: "Optimal",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      dotClass: "bg-emerald-500",
    };
  }
  if (score >= 70) {
    return {
      status: "Moderate",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
      dotClass: "bg-amber-500",
    };
  }
  return {
    status: "At Risk",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
    dotClass: "bg-rose-500",
  };
}

export default function PageHeader({
  websiteUrl,
  title,
  description,
  score,
  scoreLabel = "Score",
  actions,
  icon: Icon,
}: PageHeaderProps) {
  const roundedScore = score != null ? Math.max(0, Math.min(100, Math.round(score))) : null;
  const tier = roundedScore != null ? getScoreTier(roundedScore) : null;

  const cleanDisplayUrl = websiteUrl
    ? websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : null;

  return (
    <header className="border-b border-slate-200/80 pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: Domain Tag, Title with Inline Score Badge, and Subtitle */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {websiteUrl && cleanDisplayUrl && (
            <a
              href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50/80 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <HeaderFavicon url={websiteUrl} />
              <span className="truncate">{cleanDisplayUrl}</span>
              <ArrowUpRight className="size-3 shrink-0 text-slate-400" />
            </a>
          )}

          {/* Title Row with Integrated Score Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            {Icon && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-700 shadow-2xs">
                <Icon className="size-4" />
              </span>
            )}
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
              {title}
            </h1>

            {roundedScore != null && tier && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums ${tier.badgeClass}`}
              >
                <span className={`size-1.5 rounded-full ${tier.dotClass}`} />
                <span>{roundedScore}/100</span>
                <span className="text-[10px] font-normal opacity-70">
                  ({tier.status})
                </span>
              </span>
            )}
          </div>

          <p className="font-content text-xs sm:text-sm text-slate-500 max-w-2xl">
            {description}
          </p>
        </div>

        {/* Right Side: Action Buttons Only */}
        {actions && (
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}