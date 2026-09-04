"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SCANNERS_DATA } from "../data/scanners";
import { ScannerCategory, ScannerItem } from "../types";
import ProductHero from "../component/ProductHero";
import ScannerFilterTabs from "../component/ScannerFilterTabs";
import ScannerCard from "../component/ScannerCard";
import ScannerDetailModal from "../component/ScannerDetailModal";
import ProductStatsBanner from "../component/ProductStatsBanner";
import ProductComparisonTable from "../component/ProductComparisonTable";
import ProductCtaSection from "../component/ProductCtaSection";
import { SearchX, ArrowUpDown } from "lucide-react";

interface ProductViewProps {
  initialCategory?: string;
  initialSearch?: string;
}

export default function ProductView({
  initialCategory = "all",
  initialSearch = "",
}: ProductViewProps) {
  const [activeCategory, setActiveCategory] = useState<ScannerCategory>(
    (initialCategory as ScannerCategory) || "all"
  );
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch || "");
  const [sortBy, setSortBy] = useState<"default" | "cvss" | "checks" | "alpha">("default");
  const [selectedScanner, setSelectedScanner] = useState<ScannerItem | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  // Sync with client-side query param if user lands via client navigation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category") as ScannerCategory;
      if (cat) {
        setActiveCategory(cat);
      }
    }
  }, []);

  // Filter & Sort Scanners
  const filteredScanners = useMemo(() => {
    let result = SCANNERS_DATA.filter((scanner) => {
      const matchesCategory =
        activeCategory === "all" || scanner.category === activeCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      const inTitle = scanner.title.toLowerCase().includes(query);
      const inDesc = scanner.description.toLowerCase().includes(query);
      const inScope = scanner.detailedScope.toLowerCase().includes(query);
      const inTags = scanner.tags.some((t) => t.toLowerCase().includes(query));
      const inVector = scanner.sampleVector.toLowerCase().includes(query);

      return inTitle || inDesc || inScope || inTags || inVector;
    });

    if (sortBy === "cvss") {
      result = [...result].sort((a, b) => parseFloat(b.cvss) - parseFloat(a.cvss));
    } else if (sortBy === "checks") {
      result = [...result].sort((a, b) => b.checksCount - a.checksCount);
    } else if (sortBy === "alpha") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [activeCategory, searchQuery, sortBy]);

  // GSAP animation when filtered list changes
  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion || !gridRef.current) return;

      gsap.fromTo(
        ".scanner-card-item",
        { opacity: 0, y: 12, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.3,
          stagger: 0.025,
          ease: "power2.out",
        }
      );
    },
    { scope: gridRef, dependencies: [activeCategory, searchQuery, sortBy] }
  );

  return (
    <div className="w-full bg-[#ffffff] text-slate-900 min-h-screen">
      <div className="pt-24 pb-20 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* 1. Hero Section with Live Motion Canvas */}
        <ProductHero />

        {/* 2. Key Metrics Banner */}
        <ProductStatsBanner />

        {/* 3. Filterable Scanner Catalog */}
        <div className="space-y-6">
          <div className="space-y-4">
            <ScannerFilterTabs
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filteredCount={filteredScanners.length}
            />

            {/* Quick Sort Strip */}
            <div className="flex items-center overflow-scroll justify-between pt-1 border-t border-stone-100 text-xs text-stone-500 font-mono">
              <div className="flex items-center overflow-scroll gap-1.5">
                <ArrowUpDown className="size-3 text-stone-400" />
                <span className="whitespace-nowrap">Sort by:</span>
                {(
                  [
                    { key: "default", label: "Recommended" },
                    { key: "cvss", label: "Severity (CVSS)" },
                    { key: "checks", label: "Checks Count" },
                    { key: "alpha", label: "A-Z" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    className={`px-2 py-0.5 whitespace-nowrap rounded transition-colors cursor-pointer ${
                      sortBy === opt.key
                        ? "bg-slate-900 text-white font-semibold"
                        : "hover:text-slate-900 text-stone-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <span className="hidden sm:inline text-stone-400">
                Click any card to inspect code remediation diff
              </span>
            </div>
          </div>

          {/* Scanners Grid (3 cols on desktop matching screenshot) */}
          <div ref={gridRef}>
            {filteredScanners.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredScanners.map((scanner) => (
                  <div key={scanner.id} className="scanner-card-item">
                    <ScannerCard
                      scanner={scanner}
                      onClick={() => setSelectedScanner(scanner)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4 rounded-2xl border border-dashed border-stone-200 bg-[#fbfbfa]">
                <SearchX className="size-8 text-stone-400 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-heading text-base font-bold text-slate-900">
                    No scanners match your search
                  </h3>
                  <p className="font-content text-xs text-slate-500">
                    Try searching for different terms like &quot;SQLi&quot;, &quot;CORS&quot;, &quot;Supabase&quot;, or reset your filters.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveCategory("all");
                    setSearchQuery("");
                    setSortBy("default");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 bg-white border border-stone-200 hover:border-stone-300 shadow-2xs transition-colors cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4. Comparison Table (Scanlyst vs Legacy) */}
        <ProductComparisonTable />

        {/* 5. Conversion CTA Banner */}
        <ProductCtaSection />
      </div>

      {/* Detail Deep-Dive Modal */}
      {selectedScanner && (
        <ScannerDetailModal
          scanner={selectedScanner}
          onClose={() => setSelectedScanner(null)}
        />
      )}

      {/* Footer */}
    </div>
  );
}
