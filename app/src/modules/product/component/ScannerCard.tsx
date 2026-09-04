"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Terminal, Check, Eye } from "lucide-react";
import { ScannerItem } from "../types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ScannerCardProps {
  scanner: ScannerItem;
  onClick?: () => void;
}

export default function ScannerCard({ scanner, onClick }: ScannerCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "vulnerability":
        return "text-[#2563eb]"; // Blue
      case "configuration":
        return "text-[#4f46e5]"; // Indigo
      case "infrastructure":
        return "text-[#0284c7]"; // Sky
      case "monitoring":
        return "text-[#059669]"; // Emerald
      case "seo_aeo":
        return "text-[#e11d48]"; // Rose
      case "performance":
        return "text-[#d97706]"; // Amber
      case "compliance":
        return "text-[#7c3aed]"; // Purple
      case "accessibility":
        return "text-[#0891b2]"; // Teal
      default:
        return "text-[#2563eb]";
    }
  };

  const handleCopyVector = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(scanner.sampleVector);
    setCopied(true);
    toast.success("Sample vector copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  const handleCardClick = () => {
    router.push(`/scans/${scanner.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(`/scans/${scanner.id}`);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl bg-white p-6 sm:p-7 text-left outline-none cursor-pointer block",
        "border border-stone-200/90 transition-all duration-200 ease-out",
        "hover:border-stone-300 hover:shadow-[0_6px_24px_-6px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.03)] hover:-translate-y-0.5",
        "focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2",
        "min-h-[240px] overflow-hidden"
      )}
    >
      {/* Top subtle hairline glow on hover */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/0 to-transparent group-hover:via-rose-500/40 transition-all duration-300" />

      {/* Upper Content */}
      <div className="space-y-3">
        {/* Category Label + CVSS */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[11px] font-semibold tracking-wider uppercase font-sans",
              getCategoryColor(scanner.category)
            )}
          >
            {scanner.categoryLabel}
          </span>

          <span className="font-mono text-[11px] font-medium text-stone-400 group-hover:text-stone-600 transition-colors">
            CVSS {scanner.cvss}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-heading text-lg sm:text-[19px] font-bold text-slate-900 tracking-tight leading-snug group-hover:text-slate-950 transition-colors">
          {scanner.title}
        </h3>

        {/* Description */}
        <p className="font-content text-[13.5px] sm:text-sm text-slate-500 group-hover:text-slate-600 leading-relaxed line-clamp-3">
          {scanner.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {scanner.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="pt-4 mt-3 flex items-center justify-between border-t border-stone-100/80">
        {/* Vector Quick Copy Button */}
        <button
          type="button"
          onClick={handleCopyVector}
          title="Copy test vector"
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-stone-400 hover:text-slate-800 transition-colors p-1 -ml-1 rounded cursor-pointer"
        >
          {copied ? <Check className="size-3 text-emerald-600" /> : <Terminal className="size-3" />}
          <span className="truncate max-w-[120px] sm:max-w-[160px]">
            {copied ? "Copied" : scanner.sampleVector}
          </span>
        </button>

        {/* Right actions: Quick Peek + Navigate Arrow */}
        <div className="flex items-center gap-2">
          {onClick && (
            <button
              type="button"
              onClick={handleQuickModal}
              title="Quick drawer preview"
              className="size-6 rounded-md hover:bg-stone-100 text-stone-300 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Eye className="size-3.5" />
            </button>
          )}

          <div className="text-stone-400 group-hover:text-slate-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 shrink-0">
            <ArrowUpRight className="size-4 stroke-[2.2]" />
          </div>
        </div>
      </div>
    </div>
  );
}
