"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Globe, Loader2 } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import toast from "react-hot-toast";
import ProductMotionCanvas from "./ProductMotionCanvas";
import { useAuthScanAction } from "../hooks/useAuthScanAction";

export default function ProductHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { handleScanClick, isCreating } = useAuthScanAction();
  const [testUrl, setTestUrl] = useState("");

  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUrl.trim()) {
      toast.error("Please enter a domain or URL to inspect.");
      return;
    }
    handleScanClick(testUrl);
  };

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) return;

      gsap.from(".hero-breadcrumb", { opacity: 0, y: -8, duration: 0.4, ease: "power2.out" });
      gsap.from(".hero-eyebrow", { opacity: 0, y: 8, duration: 0.45, delay: 0.05, ease: "power2.out" });
      gsap.from(".hero-headline-line", {
        opacity: 0,
        y: 20,
        duration: 0.55,
        stagger: 0.08,
        delay: 0.1,
        ease: "power3.out",
      });
      gsap.from(".hero-narrative", { opacity: 0, y: 15, duration: 0.5, delay: 0.2, ease: "power3.out" });
      gsap.from(".hero-quick-form", { opacity: 0, y: 15, duration: 0.45, delay: 0.25, ease: "power3.out" });
      gsap.from(".hero-canvas-wrap", { opacity: 0, y: 20, duration: 0.6, delay: 0.3, ease: "power3.out" });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="w-full pt-10 md:pb-8 space-y-10">
      {/* Top Breadcrumb & Live Health Pip */}
      <div className="flex items-center justify-between">
        <div className="hero-breadcrumb">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-stone-200 bg-white text-xs font-mono font-medium text-slate-600 hover:text-slate-950 hover:border-stone-300 transition-colors shadow-2xs group cursor-pointer"
          >
            <ArrowLeft className="size-3 text-stone-400 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
            <span>Home</span>
          </Link>
        </div>

        <div className="hero-breadcrumb hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Scanner Engine v2.4 Active</span>
          <span className="text-stone-300">•</span>
          <span className="text-slate-700 font-semibold">41 Scanners Ready</span>
        </div>
      </div>

      {/* Main 2-Column Hero Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Eyebrow + Big 2-Tone Headline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-700 shadow-2xs">
            <span className="size-1.5 rounded-full bg-rose-500" />
            SECURITY · SEO · AEO
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.06]">
            <span className="hero-headline-line block">Every check,</span>
            <span className="hero-headline-line block text-slate-400 font-bold">one scanner.</span>
          </h1>
        </div>

        {/* Right Column: Narrative Block + Quick URL Launcher */}
        <div className="lg:col-span-5 space-y-6 pt-2">
          <p className="hero-narrative font-content text-sm sm:text-base text-slate-600 leading-relaxed">
            41 scanners running 200+ individual checks — SQLi, XSS, exposed keys, BaaS misconfigs,
            SSL/TLS grading, plus SEO & AEO visibility, uptime, Core Web Vitals and accessibility.
            Every finding ships with an AI-ready fix prompt.
          </p>

          {/* Quick URL Prober */}
          <div className="hero-quick-form space-y-2">
            <form
              onSubmit={handleQuickScan}
              className="flex items-center gap-2 p-1.5 rounded-2xl border border-stone-300/80 bg-white shadow-xs focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100 transition-all"
            >
              <div className="flex items-center gap-2 pl-3 flex-1 min-w-0">
                <Globe className="size-4 text-stone-400 shrink-0" />
                <input
                  type="text"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="domain.com (e.g. stripe.com)"
                  className="w-full bg-transparent font-mono text-xs sm:text-[13px] text-slate-900 placeholder:text-stone-400 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating || !testUrl.trim()}
                className="bg-background-btn inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold shadow-xs hover:shadow-sm hover:opacity-95 transition-all shrink-0 cursor-pointer disabled:opacity-60"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <span>Run Audit</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <span>Instant non-destructive check</span>
              <a href="#scanners-catalog" className="text-slate-600 hover:text-slate-950 font-medium">
                Browse catalog ↓
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Live Motion Graphics Canvas */}
      <div className="hero-canvas-wrap">
        <ProductMotionCanvas />
      </div>
    </div>
  );
}
