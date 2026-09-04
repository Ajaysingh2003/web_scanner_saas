"use client";

import React from "react";

import { HugeiconsIcon } from "@hugeicons/react";

import {
  SparklesIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  FlashIcon,
} from "@hugeicons/core-free-icons";

interface ComparisonRow {
  feature: string;
  category?: string;
  scanlyst: string;
  traditional: string;
  manual: string;
}

export default function ProductComparisonTable() {
  const rows: ComparisonRow[] = [
    {
      feature: "Scan Duration",
      scanlyst: "<45s asynchronous edge scan",
      traditional: "15 to 45 minutes",
      manual: "1 to 2 weeks turnaround",
    },
    {
      feature: "Actionable Guidance",
      scanlyst: "Unified Code Diffs + AI Prompt",
      traditional: "Generic CVE paragraphs",
      manual: "Static PDF presentation slides",
    },
    {
      feature: "Modern BaaS & RLS Testing",
      scanlyst: "Native Supabase & PostgREST probes",
      traditional: "Not supported",
      manual: "Manual permission checks",
    },
    {
      feature: "AEO & AI Search Readiness",
      scanlyst: "Schema.org & GPTBot crawler checks",
      traditional: "Not supported",
      manual: "Separate SEO audit required",
    },
    {
      feature: "1-Click Patch Verification",
      scanlyst: "Instant isolated probe in ~5s",
      traditional: "Re-run entire queue",
      manual: "Wait for consultant retest",
    },
    {
      feature: "False Positive Rate",
      scanlyst: "<0.1% strict reproduction proofs",
      traditional: "High (noisy heuristic flags)",
      manual: "Low (human verified)",
    },
    {
      feature: "Developer Setup",
      scanlyst: "Zero install — starts from URL",
      traditional: "Heavy Docker/Java CLI setup",
      manual: "Kickoff calls & onboarding",
    },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-16">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-neutral-50 px-3 py-1 text-[11px] font-medium tracking-wide text-neutral-700 shadow-xs">
          <HugeiconsIcon
            icon={SparklesIcon}
            size={13}
            strokeWidth={1.8}
            className="text-amber-500"
          />

          <span>BUILT FOR FAST-MOVING TEAMS</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 font-heading">
          Engineered for velocity, not audit fatigue
        </h2>

        <p className="text-sm sm:text-base text-neutral-500 max-w-xl mx-auto leading-relaxed font-content">
          Legacy scanners dump bloated, context-blind PDFs. Scanlyst runs
          verified reproduction tests and gives you direct code diffs.
        </p>
      </div>

      {/* =====================================================
          DESKTOP TABLE
      ====================================================== */}

      <div className="hidden md:block relative rounded-2xl border border-neutral-200/90 bg-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          {/* =================================================
              TABLE HEADER
          ================================================= */}

          <thead>
            <tr className="border-b border-neutral-200/80 bg-neutral-50/70 text-xs text-neutral-500 font-mono uppercase tracking-wider">
              {/* Capabilities */}

              <th className="w-[28%] py-4 px-6 font-semibold text-neutral-700">
                Capabilities
              </th>

              {/* Scanlyst */}

              <th className="w-[30%] py-4 px-6 bg-neutral-900 text-white font-medium relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm tracking-normal text-white">
                      Scanlyst
                    </span>

                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono font-medium text-neutral-200 border border-white/10">
                      Modern Standard
                    </span>
                  </div>

                  <HugeiconsIcon
                    icon={FlashIcon}
                    size={15}
                    strokeWidth={1.8}
                    className="text-amber-400 shrink-0"
                  />
                </div>
              </th>

              {/* Legacy */}

              <th className="w-[21%] py-4 px-6 font-medium text-neutral-600">
                Legacy Scanners
              </th>

              {/* Manual */}

              <th className="w-[21%] py-4 px-6 font-medium text-neutral-600">
                Manual Agency Audits
              </th>
            </tr>
          </thead>

          {/* =================================================
              TABLE BODY
          ================================================= */}

          <tbody className="divide-y divide-neutral-100 text-[13px]">
            {rows.map((row) => {
              const isScanlystSupported = !row.scanlyst
                .toLowerCase()
                .includes("not supported");

              const isLegacySupported = !row.traditional
                .toLowerCase()
                .includes("not supported");

              const isManualSupported = !row.manual
                .toLowerCase()
                .includes("not supported");

              return (
                <tr
                  key={row.feature}
                  className="group hover:bg-neutral-50/50 transition-colors duration-200"
                >
                  {/* =========================================
                      FEATURE
                  ========================================== */}

                  <td className="py-4 px-6 font-medium text-neutral-800">
                    {row.feature}
                  </td>

                  {/* =========================================
                      SCANLYST
                  ========================================== */}

                  <td className="py-4 px-6 bg-neutral-900/[0.02] border-x border-neutral-900/10 font-medium text-neutral-900">
                    <div className="flex items-start gap-2.5">
                      {isScanlystSupported ? (
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          size={16}
                          strokeWidth={2}
                          className="text-emerald-600 shrink-0 mt-[1px]"
                        />
                      ) : (
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={15}
                          strokeWidth={1.8}
                          className="text-neutral-400 shrink-0 mt-[1px]"
                        />
                      )}

                      <span className="font-semibold text-neutral-950 leading-relaxed">
                        {row.scanlyst}
                      </span>
                    </div>
                  </td>

                  {/* =========================================
                      LEGACY
                  ========================================== */}

                  <td className="py-4 px-6 text-neutral-600">
                    <div className="flex items-start gap-2.5">
                      {isLegacySupported ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0 mt-[6px]" />
                      ) : (
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={14}
                          strokeWidth={1.8}
                          className="text-neutral-300 shrink-0 mt-[1px]"
                        />
                      )}

                      <span
                        className={
                          isLegacySupported
                            ? "leading-relaxed"
                            : "text-neutral-400 italic leading-relaxed"
                        }
                      >
                        {row.traditional}
                      </span>
                    </div>
                  </td>

                  {/* =========================================
                      MANUAL
                  ========================================== */}

                  <td className="py-4 px-6 text-neutral-600">
                    <div className="flex items-start gap-2.5">
                      {isManualSupported ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0 mt-[6px]" />
                      ) : (
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={14}
                          strokeWidth={1.8}
                          className="text-neutral-300 shrink-0 mt-[1px]"
                        />
                      )}

                      <span
                        className={
                          isManualSupported
                            ? "leading-relaxed"
                            : "text-neutral-400 italic leading-relaxed"
                        }
                      >
                        {row.manual}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* =====================================================
          MOBILE CARDS
      ====================================================== */}

      <div className="md:hidden space-y-4">
        {rows.map((row) => {
          const isLegacySupported = !row.traditional
            .toLowerCase()
            .includes("not supported");

          const isManualSupported = !row.manual
            .toLowerCase()
            .includes("not supported");

          return (
            <div
              key={row.feature}
              className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-xs space-y-3"
            >
              {/* Feature */}

              <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-semibold border-b border-neutral-100 pb-2">
                {row.feature}
              </h3>

              {/* =============================================
                  SCANLYST
              ============================================== */}

              <div className="flex items-start gap-2.5 bg-neutral-900 text-white p-3 rounded-lg">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={16}
                  strokeWidth={2}
                  className="text-emerald-400 shrink-0 mt-0.5"
                />

                <div className="text-xs">
                  <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wide mb-0.5">
                    Scanlyst
                  </p>

                  <p className="font-medium text-white leading-relaxed">
                    {row.scanlyst}
                  </p>
                </div>
              </div>

              {/* =============================================
                  COMPETITORS
              ============================================== */}

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                {/* Legacy */}

                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100">
                  <p className="font-mono text-[10px] text-neutral-400 uppercase mb-1">
                    Legacy Scanners
                  </p>

                  <div className="flex items-start gap-1.5">
                    {!isLegacySupported && (
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        size={13}
                        strokeWidth={1.8}
                        className="text-neutral-300 shrink-0 mt-[1px]"
                      />
                    )}

                    <p
                      className={
                        isLegacySupported
                          ? "text-neutral-700 font-medium leading-relaxed"
                          : "text-neutral-400 font-medium italic leading-relaxed"
                      }
                    >
                      {row.traditional}
                    </p>
                  </div>
                </div>

                {/* Manual */}

                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100">
                  <p className="font-mono text-[10px] text-neutral-400 uppercase mb-1">
                    Manual Agency
                  </p>

                  <div className="flex items-start gap-1.5">
                    {!isManualSupported && (
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        size={13}
                        strokeWidth={1.8}
                        className="text-neutral-300 shrink-0 mt-[1px]"
                      />
                    )}

                    <p
                      className={
                        isManualSupported
                          ? "text-neutral-700 font-medium leading-relaxed"
                          : "text-neutral-400 font-medium italic leading-relaxed"
                      }
                    >
                      {row.manual}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}