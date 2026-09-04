"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { CATEGORY_TABS } from "../data/scanners";
import { ScannerCategory } from "../types";
import { cn } from "@/lib/utils";

interface ScannerFilterTabsProps {
  activeCategory: ScannerCategory;
  onSelectCategory: (category: ScannerCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredCount: number;
}

export default function ScannerFilterTabs({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  filteredCount,
}: ScannerFilterTabsProps) {
  return (
    <div id="scanners-catalog" className="w-full space-y-4 pt-4">
      {/* Search Bar + Active Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search checks, attack vectors, or CVEs..."
            className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-[13px] rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 text-neutral-900 shadow-2xs focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-neutral-500 flex items-center gap-1.5 self-end sm:self-auto">
          <span>Showing</span>
          <span className="font-semibold text-neutral-900">{filteredCount}</span>
          <span>of 41 scanners</span>
        </div>
      </div>

      {/* Filter Category Pills (Matching reference image exactly) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeCategory === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectCategory(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-[#18181b] text-white shadow-2xs"
                  : "bg-[#f4f4f5]/90 border border-neutral-200/60 text-neutral-600 hover:bg-[#e4e4e7] hover:text-neutral-900"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[10px] font-mono",
                  isActive ? "text-white/60 font-semibold" : "text-neutral-400 font-normal"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
