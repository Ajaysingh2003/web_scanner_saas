"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Terminal,
  Code2,
  Copy,
  Check,
  Play,
  RotateCcw,
  Globe,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import { ScannerItem } from "../types";
import { SCANNERS_DATA } from "../data/scanners";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuthScanAction } from "../hooks/useAuthScanAction";

interface ScanDetailViewProps {
  scanner: ScannerItem;
}

export default function ScanDetailView({ scanner }: ScanDetailViewProps) {
  const router = useRouter();
  const { handleScanClick } = useAuthScanAction();
  const [testUrl, setTestUrl] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [copiedVector, setCopiedVector] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simOutput, setSimOutput] = useState<string[]>([]);

  // 3 Complementary Related Scanners
  const relatedScanners = SCANNERS_DATA.filter(
    (s) => s.id !== scanner.id && (s.category === scanner.category || s.severity === scanner.severity)
  ).slice(0, 3);

  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUrl.trim()) {
      toast.error("Please enter a domain to inspect.");
      return;
    }
    handleScanClick(testUrl);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(scanner.aiFixPrompt);
    setCopiedPrompt(true);
    toast.success("AI fix prompt copied!");
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyDiff = () => {
    if (scanner.codeDiff) {
      navigator.clipboard.writeText(scanner.codeDiff.good);
      setCopiedDiff(true);
      toast.success("Remediated code patch copied!");
      setTimeout(() => setCopiedDiff(false), 2000);
    }
  };

  const handleCopyVector = () => {
    navigator.clipboard.writeText(scanner.sampleVector);
    setCopiedVector(true);
    toast.success("Sample vector copied!");
    setTimeout(() => setCopiedVector(false), 2000);
  };

  const runSimulation = () => {
    setIsSimulating(true);
    setSimOutput([
      `$ scanlyst probe --vector="${scanner.id}" --target=https://staging.internal.net`,
      `[00:00.012] Handshaking TLS 1.3 socket (Cipher: TLS_AES_128_GCM_SHA256)...`,
      `[00:00.045] Injecting test pattern: ${scanner.sampleVector}`,
      `[00:00.128] HTTP 200 OK received in 83ms (Payload reflected in body without sanitization)`,
      `[00:00.160] Assertion triggered: CVSS ${scanner.cvss} (${scanner.severity}) confirmed.`,
      `[00:00.190] Verification complete: 0 false-positive reproduction proof generated.`,
    ]);
    setTimeout(() => {
      setIsSimulating(false);
    }, 500);
  };

  // Human-designed severity label
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border-orange-200/80";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "LOW":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200/80";
    }
  };

  return (
    <div className="w-full bg-[#ffffff] text-slate-900 min-h-screen">
      <div className="pt-24 pb-20 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* =========================================================================
            1. BREADCRUMB & METADATA BAR
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-5">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <Link
              href="/scans"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-stone-200 bg-white hover:bg-stone-50 hover:text-slate-900 transition-colors shadow-2xs group cursor-pointer"
            >
              <ArrowLeft className="size-3 text-stone-400 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
              <span>Catalog</span>
            </Link>
            <span className="text-stone-300">/</span>
            <span className="text-slate-500 uppercase tracking-wider">{scanner.categoryLabel}</span>
            <span className="text-stone-300">/</span>
            <span className="text-slate-900 font-semibold">{scanner.id}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>SCAN-ID: {scanner.id.toUpperCase()}</span>
            <span className="text-stone-300">•</span>
            <span className="text-slate-600 font-medium">REVISION 2026.4</span>
          </div>
        </div>

        {/* =========================================================================
            2. TWO-COLUMN DOSSIER LAYOUT (Left: Technical Paper, Right: Sticky Rail)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* -----------------------------------------------------------------------
              LEFT COLUMN: Technical Specification & Remediation (68% width)
              ----------------------------------------------------------------------- */}
          <div className="lg:col-span-8 space-y-12">
            {/* Header Block */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                  {scanner.categoryLabel}
                </span>
                <span className="text-stone-300">•</span>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border",
                    getSeverityBadge(scanner.severity)
                  )}
                >
                  CVSS {scanner.cvss} ({scanner.severity})
                </span>
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 leading-tight">
                {scanner.title}
              </h1>

              <p className="font-content text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                {scanner.description}
              </p>
            </div>

            {/* Section: Inspection Scope & Technical Behavior */}
            <div className="space-y-4 border-t border-stone-200/80 pt-8">
              <h2 className="font-heading text-xl font-bold text-slate-950 tracking-tight">
                Technical Scope & Verification Behavior
              </h2>

              <p className="font-content text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                {scanner.detailedScope}
              </p>

              <div className="rounded-xl border border-stone-200/80 bg-[#fafaf9] p-4 text-xs font-sans space-y-2 text-slate-600">
                <div className="font-semibold text-slate-900 uppercase font-mono text-[10.5px] tracking-wider text-slate-500">
                  Automated Inspection Checks ({scanner.checksCount})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span>Passive URL parameter fuzzing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span>Non-destructive boundary tests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span>Header & cookie flag assertions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span>Differential latency timing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Proof of Concept / Tested Attack Vector */}
            <div className="space-y-4 border-t border-stone-200/80 pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-xl font-bold text-slate-950 tracking-tight">
                    Proof of Concept (PoC) Vector
                  </h2>
                  <p className="font-content text-xs sm:text-sm text-slate-500 mt-0.5">
                    Canonical test payload dispatched during security surface audits.
                  </p>
                </div>

                <button
                  onClick={handleCopyVector}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-slate-600 hover:text-slate-950 transition-colors p-1.5 rounded-md hover:bg-stone-100 cursor-pointer"
                >
                  {copiedVector ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  <span>{copiedVector ? "Copied" : "Copy Payload"}</span>
                </button>
              </div>

              {/* Code Snippet Box */}
              <div className="rounded-xl border border-stone-200 bg-[#f8f9fa] p-4 font-mono text-xs text-slate-900 overflow-x-auto shadow-2xs">
                <code>{scanner.sampleVector}</code>
              </div>
            </div>

            {/* Section: Interactive Probe Simulator */}
            <div className="space-y-4 border-t border-stone-200/80 pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-xl font-bold text-slate-950 tracking-tight">
                    Probe Execution Simulator
                  </h2>
                  <p className="font-content text-xs sm:text-sm text-slate-500 mt-0.5">
                    Watch the probe engine test this signature in an isolated sandbox.
                  </p>
                </div>

                <button
                  onClick={runSimulation}
                  disabled={isSimulating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSimulating ? <RotateCcw className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  <span>{isSimulating ? "Running..." : "Simulate Check"}</span>
                </button>
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#0f172a] text-slate-200 p-4 font-mono text-xs space-y-1.5 min-h-[160px] shadow-2xs">
                <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-800 text-[11px] text-slate-400">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>probe-runner (isolated ephemeral container)</span>
                </div>
                {simOutput.length > 0 ? (
                  simOutput.map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        "leading-relaxed",
                        line.startsWith("$") ? "text-slate-400 font-bold" :
                        line.includes("SUCCESS") || line.includes("complete") ? "text-emerald-400 font-bold" : "text-slate-300"
                      )}
                    >
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic py-6 text-center">
                    Click &apos;Simulate Check&apos; to watch the headless audit engine test this vector.
                  </div>
                )}
              </div>
            </div>

            {/* Section: Unified Code Remediation Patch */}
            {scanner.codeDiff && (
              <div className="space-y-4 border-t border-stone-200/80 pt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-heading text-xl font-bold text-slate-950 tracking-tight">
                      Remediation Patch
                    </h2>
                    <p className="font-content text-xs sm:text-sm text-slate-500 mt-0.5">
                      {scanner.codeDiff.title}
                    </p>
                  </div>

                  <button
                    onClick={handleCopyDiff}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-mono font-medium text-slate-800 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                  >
                    {copiedDiff ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copiedDiff ? "Copied" : "Copy Patch"}</span>
                  </button>
                </div>

                {/* Git Diff Style Block */}
                <div className="rounded-xl border border-stone-200 overflow-hidden font-mono text-xs shadow-2xs">
                  {/* File header */}
                  <div className="bg-[#f4f4f5] px-4 py-2 border-b border-stone-200 text-slate-600 text-[11px] font-semibold">
                    patch.diff ({scanner.codeDiff.language})
                  </div>

                  {/* Vulnerable */}
                  <div className="bg-rose-50/70 p-4 border-b border-rose-100/80 text-rose-950">
                    <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">
                      --- a/handler.{scanner.codeDiff.language} (Vulnerable)
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap">{scanner.codeDiff.bad}</pre>
                  </div>

                  {/* Remediated */}
                  <div className="bg-emerald-50/70 p-4 text-emerald-950">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                      +++ b/handler.{scanner.codeDiff.language} (Remediated)
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap">{scanner.codeDiff.good}</pre>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {scanner.codeDiff.explanation}
                </p>
              </div>
            )}

            {/* Section: AI Agent Prompt */}
            <div className="space-y-4 border-t border-stone-200/80 pt-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading text-xl font-bold text-slate-950 tracking-tight">
                    AI Agent Prompt (Cursor · Claude · Copilot)
                  </h2>
                  <p className="font-content text-xs sm:text-sm text-slate-500 mt-0.5">
                    Copy and paste into your editor to refactor this issue automatically.
                  </p>
                </div>

                <button
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-mono font-medium text-slate-800 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                >
                  {copiedPrompt ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  <span>{copiedPrompt ? "Copied" : "Copy Prompt"}</span>
                </button>
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#f8f9fa] p-4 font-mono text-xs sm:text-[13px] text-slate-800 leading-relaxed shadow-2xs">
                &quot;{scanner.aiFixPrompt}&quot;
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              RIGHT COLUMN: Sticky Specification Rail (32% width)
              ----------------------------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Quick URL Prober Box */}
            <div className="rounded-2xl border border-stone-200 bg-[#fafaf9] p-5 shadow-2xs space-y-4">
              <div className="space-y-1">
                <h3 className="font-heading text-sm font-bold text-slate-900">
                  Run Isolated Check
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Test your public domain specifically for {scanner.title}.
                </p>
              </div>

              <form onSubmit={handleQuickScan} className="space-y-2.5">
                <div className="flex items-center gap-2 p-1.5 rounded-xl border border-stone-300/90 bg-white shadow-xs focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100 transition-all">
                  <Globe className="size-3.5 text-stone-400 ml-2 shrink-0" />
                  <input
                    type="text"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="domain.com"
                    className="w-full bg-transparent px-1.5 py-1.5 font-mono text-xs text-slate-900 placeholder:text-stone-400 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-background-btn w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm hover:opacity-95 transition-all cursor-pointer"
                >
                  <span>Scan This Vector Now</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </form>

              <div className="text-[10.5px] font-mono text-slate-400 text-center">
                100% passive • No server load
              </div>
            </div>

            {/* Specification Metadata Breakdown */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Specification Details
              </h3>

              <dl className="space-y-3 font-sans text-xs divide-y divide-stone-100">
                <div className="flex items-center justify-between pt-2 first:pt-0">
                  <dt className="text-slate-500 font-medium">CVSS Score</dt>
                  <dd className="font-mono font-bold text-slate-900">{scanner.cvss} / 10.0</dd>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <dt className="text-slate-500 font-medium">Severity Level</dt>
                  <dd className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border", getSeverityBadge(scanner.severity))}>
                    {scanner.severity}
                  </dd>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <dt className="text-slate-500 font-medium">Category</dt>
                  <dd className="font-mono text-slate-900 capitalize">{scanner.categoryLabel}</dd>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <dt className="text-slate-500 font-medium">Test Vectors</dt>
                  <dd className="font-mono text-slate-900">{scanner.checksCount} automated</dd>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <dt className="text-slate-500 font-medium">Execution SLA</dt>
                  <dd className="font-mono text-slate-900">&lt; 2.5 seconds</dd>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <dt className="text-slate-500 font-medium">False Positive Defense</dt>
                  <dd className="font-mono text-emerald-600 font-semibold">Strict assertion</dd>
                </div>
              </dl>
            </div>

            {/* Taxonomy Tags */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Related Standards
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scanner.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-[#f4f4f5] px-2 py-1 text-[11px] font-mono text-slate-600 border border-stone-200/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. FREQUENTLY AUDITED TOGETHER (RELATED SCANNERS)
            ========================================================================= */}
        {relatedScanners.length > 0 && (
          <div className="space-y-6 border-t border-stone-200/80 pt-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-xl font-bold text-slate-950 tracking-tight">
                  Frequently Audited Together
                </h3>
                <p className="font-content text-xs sm:text-sm text-slate-500 mt-0.5">
                  Checks commonly evaluated alongside {scanner.title} during surface discovery.
                </p>
              </div>

              <Link
                href="/scans"
                className="text-xs font-mono font-semibold text-slate-700 hover:text-slate-950 transition-colors"
              >
                View all 41 checks →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {relatedScanners.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/scans/${rel.id}`}
                  className="group p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs transition-all flex flex-col justify-between min-h-[170px] cursor-pointer"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      {rel.categoryLabel}
                    </span>
                    <h4 className="font-heading text-base font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                      {rel.title}
                    </h4>
                    <p className="font-content text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {rel.description}
                    </p>
                  </div>

                  <div className="pt-3 flex items-center justify-between text-xs font-mono text-stone-400 border-t border-stone-100 mt-2">
                    <span>CVSS {rel.cvss}</span>
                    <ArrowUpRight className="size-3.5 group-hover:text-slate-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            4. BOTTOM ACTION STRIP
            ========================================================================= */}
        <div className="rounded-2xl border border-stone-200/90 bg-[#fafaf9] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-heading text-xl font-bold text-slate-950">
              Run continuous monitoring for {scanner.title}
            </h3>
            <p className="font-content text-xs sm:text-sm text-slate-500">
              Audit your site across all 41 vectors automatically on every deploy.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleScanClick()}
              className="bg-background-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm hover:opacity-95 transition-all cursor-pointer"
            >
              <span>Launch Free Audit</span>
              <ArrowRight className="size-3.5" />
            </button>
            <Link
              href="/scans"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors shadow-2xs cursor-pointer"
            >
              <span>Back to Catalog</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Global Footer */}
    </div>
  );
}
