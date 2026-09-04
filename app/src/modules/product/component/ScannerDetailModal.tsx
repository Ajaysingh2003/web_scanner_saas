"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  Code2,
  Sparkles,
  ArrowRight,
  Play,
  RotateCcw,
} from "lucide-react";
import { ScannerItem } from "../types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuthScanAction } from "../hooks/useAuthScanAction";

interface ScannerDetailModalProps {
  scanner: ScannerItem | null;
  onClose: () => void;
}

export default function ScannerDetailModal({
  scanner,
  onClose,
}: ScannerDetailModalProps) {
  const { handleScanClick } = useAuthScanAction();
  const [activeTab, setActiveTab] = useState<"overview" | "code" | "ai" | "simulator">("overview");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simOutput, setSimOutput] = useState<string[]>([]);

  // Reset tab on scanner change
  useEffect(() => {
    setActiveTab("overview");
    setSimOutput([]);
    setIsSimulating(false);
  }, [scanner]);

  // Keyboard close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!scanner) return null;

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
      toast.success("Remediated code copied!");
      setTimeout(() => setCopiedDiff(false), 2000);
    }
  };

  const runSimulation = () => {
    setIsSimulating(true);
    setSimOutput([
      `[00:00.02] Initializing isolated probe engine for: ${scanner.title}...`,
      `[00:00.12] Dispatching probe payload: ${scanner.sampleVector}`,
      `[00:00.28] Negotiating TLS 1.3 socket to target endpoint...`,
      `[00:00.41] Evaluating response body & status code...`,
      `[00:00.55] Result: Attack vector isolated. CVSS ${scanner.cvss} (${scanner.severity}) verified.`,
      `[00:00.60] PASS — Generated 1-click remediation diff and AI fix prompt.`,
    ]);
    setTimeout(() => {
      setIsSimulating(false);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200/80 flex items-start justify-between gap-4 bg-[#fafaf9]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-rose-600 uppercase">
                {scanner.categoryLabel}
              </span>
              <span className="text-stone-300">•</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                CVSS {scanner.cvss} · {scanner.severity}
              </span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-slate-950">
              {scanner.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:text-slate-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-stone-200/70 bg-[#fafaf9] overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-3 py-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "overview"
                ? "border-rose-600 text-slate-900"
                : "border-transparent text-stone-500 hover:text-slate-800"
            )}
          >
            Overview & Scope
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "px-3 py-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "code"
                ? "border-rose-600 text-slate-900"
                : "border-transparent text-stone-500 hover:text-slate-800"
            )}
          >
            Code Remediation Diff
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={cn(
              "px-3 py-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "ai"
                ? "border-rose-600 text-slate-900"
                : "border-transparent text-stone-500 hover:text-slate-800"
            )}
          >
            AI Fix Prompt
          </button>
          <button
            onClick={() => setActiveTab("simulator")}
            className={cn(
              "px-3 py-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5",
              activeTab === "simulator"
                ? "border-rose-600 text-slate-900"
                : "border-transparent text-stone-500 hover:text-slate-800"
            )}
          >
            <Terminal className="size-3 text-rose-500" />
            <span>Probe Simulator</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 min-h-[300px]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="space-y-2">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-rose-500" />
                  <span>Inspection Scope & Coverage</span>
                </h4>
                <p className="font-content text-slate-600 leading-relaxed text-xs sm:text-sm bg-stone-50/80 p-4 rounded-xl border border-stone-200/70">
                  {scanner.detailedScope}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Terminal className="size-3.5 text-stone-500" />
                  <span>Tested Attack Vector / Payload</span>
                </h4>
                <div className="font-mono text-xs bg-slate-950 text-slate-200 p-3.5 rounded-xl overflow-x-auto border border-slate-800 flex items-center justify-between gap-3">
                  <code>{scanner.sampleVector}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(scanner.sampleVector);
                      toast.success("Vector copied!");
                    }}
                    className="text-stone-400 hover:text-white transition-colors shrink-0"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {scanner.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 border border-stone-200/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CODE DIFF */}
          {activeTab === "code" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {scanner.codeDiff ? (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Code2 className="size-3.5 text-indigo-500" />
                      <span>{scanner.codeDiff.title}</span>
                    </h4>
                    <button
                      onClick={handleCopyDiff}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      {copiedDiff ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                      <span>{copiedDiff ? "Copied" : "Copy patch"}</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-stone-200 overflow-hidden font-mono text-xs">
                    <div className="bg-rose-50/60 p-3.5 border-b border-rose-100 text-rose-900">
                      <div className="text-[10px] font-bold text-rose-600 uppercase mb-1">
                        − Vulnerable Implementation
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">{scanner.codeDiff.bad}</pre>
                    </div>

                    <div className="bg-emerald-50/60 p-3.5 text-emerald-950">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">
                        + Secure Remediated Patch
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">{scanner.codeDiff.good}</pre>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 italic">
                    {scanner.codeDiff.explanation}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500">No code diff required for this infrastructure check.</p>
              )}
            </div>
          )}

          {/* TAB 3: AI PROMPT */}
          {activeTab === "ai" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-rose-500" />
                  <span>Agent Prompt (Cursor / Claude / Copilot)</span>
                </h4>
                <button
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {copiedPrompt ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>{copiedPrompt ? "Copied" : "Copy prompt"}</span>
                </button>
              </div>
              <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl font-mono text-xs text-slate-700 leading-relaxed">
                &quot;{scanner.aiFixPrompt}&quot;
              </div>
              <p className="text-[11px] text-slate-400">
                Paste directly into Cursor AI or Claude to let your coding agent refactor the affected file automatically.
              </p>
            </div>
          )}

          {/* TAB 4: PROBE SIMULATOR */}
          {activeTab === "simulator" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Simulate scanner execution against an isolated sandboxed target:</span>
                <button
                  onClick={runSimulation}
                  disabled={isSimulating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSimulating ? <RotateCcw className="size-3 animate-spin" /> : <Play className="size-3" />}
                  <span>{isSimulating ? "Probing..." : "Run Test"}</span>
                </button>
              </div>

              <div className="font-mono text-xs bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-800 min-h-[160px] space-y-1.5">
                {simOutput.length > 0 ? (
                  simOutput.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "leading-relaxed",
                        line.includes("PASS") ? "text-emerald-400 font-bold" : "text-slate-300"
                      )}
                    >
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-stone-500 italic">
                    Click &apos;Run Test&apos; to watch the headless audit engine execute this check...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-200 bg-[#fafaf9] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-950 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              handleScanClick();
            }}
            className="bg-background-btn inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <span>Run Free Audit on Your URL</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
