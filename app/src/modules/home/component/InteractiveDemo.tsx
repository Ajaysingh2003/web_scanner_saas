"use client";

import React, { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { TextPlugin } from "gsap/TextPlugin";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Globe2,
  Lock,
  SearchCheck,
  Zap,
  Radar,
  Radio,
  Activity,
  Play,
  RotateCcw,
  ChevronRight,
  X,
  Bell,
  CheckCircle2,
  Check,
  ExternalLink,
  Layers,
  FileCode2,
  ArrowRight,
} from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(TextPlugin);
}

interface FindingItem {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  category: "configuration" | "application" | "network" | "headers";
  endpoint: string;
  description: string;
  evidence: string;
  remediationTitle: string;
  beforeCode: string;
  afterCode: string;
}

const findingsList: FindingItem[] = [
  {
    id: "csp",
    severity: "HIGH",
    title: "Missing content-security-policy",
    category: "configuration",
    endpoint: "HTTP Response Headers",
    description:
      "The server does not specify a Content-Security-Policy (CSP) response header, leaving the application vulnerable to cross-site scripting (XSS) and unauthorized resource injection.",
    evidence: "Content-Security-Policy: [None returned]",
    remediationTitle: "Implement a strict Content-Security-Policy header restricting script execution.",
    beforeCode: "Content-Security-Policy: (missing)",
    afterCode: "Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com;",
  },
  {
    id: "cors",
    severity: "HIGH",
    title: "CORS wildcard origin",
    category: "configuration",
    endpoint: "/config/api",
    description:
      "The application accepts requests from arbitrary origins without credentials validation, potentially exposing authenticated API responses to untrusted third-party contexts.",
    evidence: "Access-Control-Allow-Origin: *",
    remediationTitle: "Restrict allowed origins to explicitly trusted domains.",
    beforeCode: "Access-Control-Allow-Origin: *",
    afterCode: "Access-Control-Allow-Origin: https://app.example.com",
  },
  {
    id: "ratelimit",
    severity: "MEDIUM",
    title: "Missing request rate limiting",
    category: "application",
    endpoint: "/api/v1/auth/login",
    description:
      "The authentication endpoint does not enforce sliding-window request throttling, permitting automated high-velocity credential stuffing attempts.",
    evidence: "X-RateLimit-Limit: none",
    remediationTitle: "Enforce strict IP-scoped sliding window rate limiting on auth routes.",
    beforeCode: "rate_limit_enabled: false",
    afterCode: "rate_limit: 10/min, window: 60s, burst: 15",
  },
  {
    id: "tls",
    severity: "LOW",
    title: "TLS certificate chain",
    category: "network",
    endpoint: "Port 443 (HTTPS)",
    description:
      "Legacy TLS 1.0/1.1 cipher suites remain negotiated on intermediate edge proxies alongside TLS 1.3.",
    evidence: "TLSv1.0 CBC Ciphers: Enabled",
    remediationTitle: "Disable deprecated TLS protocols and enforce strict TLS 1.2+ ciphers.",
    beforeCode: "ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;",
    afterCode: "ssl_protocols TLSv1.2 TLSv1.3; ssl_prefer_server_ciphers on;",
  },
];

export default function InteractiveDemo() {
  const [url, setUrl] = useState("example.com");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "complete">("idle");
  const [scoreVal, setScoreVal] = useState<number | null>(null);
  const [activeStatusText, setActiveStatusText] = useState("READY FOR SCAN");
  const [metric1, setMetric1] = useState<number | null>(null);
  const [metric2, setMetric2] = useState<number | null>(null);
  const [metric3, setMetric3] = useState<string | null>(null);
  const [metric4, setMetric4] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<FindingItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scoreRingCircleRef = useRef<SVGCircleElement>(null);
  const trendLineRef = useRef<SVGPathElement>(null);
  const mainTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const { contextSafe } = useGSAP(
    () => {
      // Initial GSAP setup
      gsap.set(".mask-child", { yPercent: 110 });
      gsap.set(".finding-row", { opacity: 0, y: 6 });
      gsap.set(".finding-row-divider", { scaleX: 0, transformOrigin: "left center" });
      gsap.set(".chart-dot", { scale: 0, transformOrigin: "center" });
      gsap.set(".donut-segment", { strokeDashoffset: 240 });
      gsap.set(".metric-card", { opacity: 0.4, y: 4 });
      gsap.set(".drawer-panel", { xPercent: 105, opacity: 0 });

      if (trendLineRef.current) {
        gsap.set(trendLineRef.current, { strokeDashoffset: 260, strokeDasharray: 260 });
      }
      if (scoreRingCircleRef.current) {
        gsap.set(scoreRingCircleRef.current, { strokeDashoffset: 276.46, strokeDasharray: 276.46 });
      }
    },
    { scope: containerRef }
  );

  const runScan = contextSafe((targetUrl?: string) => {
    if (mainTimelineRef.current) {
      mainTimelineRef.current.kill();
    }

    const currentUrl = targetUrl || url || "example.com";
    setUrl(currentUrl);
    setScanState("scanning");
    setScoreVal(null);
    setMetric1(null);
    setMetric2(null);
    setMetric3(null);
    setMetric4(null);
    setDrawerOpen(false);
    setSelectedFinding(null);

    // Reset visual elements
    gsap.set(".mask-child", { yPercent: 110 });
    gsap.set(".finding-row", { opacity: 0, y: 6 });
    gsap.set(".finding-row-divider", { scaleX: 0 });
    gsap.set(".chart-dot", { scale: 0 });
    gsap.set(".donut-segment", { strokeDashoffset: 240 });
    gsap.set(".metric-card", { opacity: 0.4, y: 4 });
    gsap.set(".drawer-panel", { xPercent: 105, opacity: 0 });

    if (trendLineRef.current) {
      gsap.set(trendLineRef.current, { strokeDashoffset: 260 });
    }
    if (scoreRingCircleRef.current) {
      gsap.set(scoreRingCircleRef.current, { strokeDashoffset: 276.46 });
    }

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        setScanState("complete");
      },
    });

    // 0.20s - Score ring starts progressing
    tl.to(
      scoreRingCircleRef.current,
      {
        strokeDashoffset: 140, // intermediate scanning progress
        duration: 2.8,
        ease: "power1.inOut",
      },
      0.2
    );

    // 0.35s - Status 1: Inspecting security headers
    tl.call(() => setActiveStatusText("Inspecting security headers"), undefined, 0.35);
    tl.fromTo(
      ".status-text-anim",
      { yPercent: 110 },
      { yPercent: 0, duration: 0.35, ease: "power3.out" },
      0.35
    );

    // 0.80s - Metric 1 resolves: Total findings -> 36
    tl.to("#metric-card-1", { opacity: 1, y: 0, duration: 0.35 }, 0.8)
      .to(
        { val: 0 },
        {
          val: 36,
          duration: 0.8,
          ease: "power2.out",
          onUpdate: function () {
            setMetric1(Math.round(this.targets()[0].val));
          },
        },
        0.8
      );

    // 1.15s - Status 2: Testing cross-origin policies
    tl.call(() => setActiveStatusText("Testing cross-origin policies"), undefined, 1.15);
    tl.fromTo(
      ".status-text-anim",
      { yPercent: 110 },
      { yPercent: 0, duration: 0.35, ease: "power3.out" },
      1.15
    );

    // 1.40s - Metric 2 resolves: High & critical -> 10
    tl.to("#metric-card-2", { opacity: 1, y: 0, duration: 0.35 }, 1.4)
      .to(
        { val: 0 },
        {
          val: 10,
          duration: 0.8,
          ease: "power2.out",
          onUpdate: function () {
            setMetric2(Math.round(this.targets()[0].val));
          },
        },
        1.4
      );

    // 1.80s - Status 3: Checking public exposure
    tl.call(() => setActiveStatusText("Checking public exposure"), undefined, 1.8);
    tl.fromTo(
      ".status-text-anim",
      { yPercent: 110 },
      { yPercent: 0, duration: 0.35, ease: "power3.out" },
      1.8
    );

    // 2.05s - Metric 3 resolves: Scan status -> Up to date
    tl.to("#metric-card-3", { opacity: 1, y: 0, duration: 0.35 }, 2.05)
      .call(() => setMetric3("Up to date"), undefined, 2.05);

    // 2.40s - Status 4: Analyzing threat surface
    tl.call(() => setActiveStatusText("Analyzing threat surface"), undefined, 2.4);
    tl.fromTo(
      ".status-text-anim",
      { yPercent: 110 },
      { yPercent: 0, duration: 0.35, ease: "power3.out" },
      2.4
    );

    // 2.65s - Metric 4 resolves: Environments -> 1 / 3
    tl.to("#metric-card-4", { opacity: 1, y: 0, duration: 0.35 }, 2.65)
      .call(() => setMetric4("1 / 3"), undefined, 2.65);

    // 3.00s - Score finalizes to 66 (ring offset: 276.46 * (1 - 0.66) = 93.99)
    tl.to(
      scoreRingCircleRef.current,
      {
        strokeDashoffset: 93.99,
        duration: 0.8,
        ease: "power3.out",
      },
      3.0
    ).to(
      { val: 0 },
      {
        val: 66,
        duration: 0.8,
        ease: "power2.out",
        onUpdate: function () {
          setScoreVal(Math.round(this.targets()[0].val));
        },
      },
      3.0
    );

    // 3.25s - Open findings subtext reveals
    tl.to(".score-subtext .mask-child", { yPercent: 0, duration: 0.35 }, 3.25);

    // 3.40s - Score Trend SVG line draws across, dots appear
    if (trendLineRef.current) {
      tl.to(
        trendLineRef.current,
        {
          strokeDashoffset: 0,
          duration: 0.8,
          ease: "power2.inOut",
        },
        3.4
      ).to(
        ".chart-dot",
        {
          scale: 1,
          stagger: 0.08,
          duration: 0.25,
          ease: "back.out(2)",
        },
        3.7
      );
    }

    // 3.80s - Donut segments animate sequentially
    // Circumference = 238.76. Lengths: High(66.32), Med(99.48), Low(39.79), Info(33.16)
    tl.to("#donut-seg-high", { strokeDashoffset: 238.76 - 66.32, duration: 0.4, ease: "power2.out" }, 3.8)
      .to("#donut-seg-med", { strokeDashoffset: 238.76 - (66.32 + 99.48), duration: 0.4, ease: "power2.out" }, 3.95)
      .to("#donut-seg-low", { strokeDashoffset: 238.76 - (66.32 + 99.48 + 39.79), duration: 0.3, ease: "power2.out" }, 4.1)
      .to("#donut-seg-info", { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" }, 4.2);

    // 4.20s - Needs Attention Header reveals
    tl.to(".needs-attention-heading .mask-child", { yPercent: 0, duration: 0.35 }, 4.2);

    // 4.35s - 4.95s: Finding rows reveal sequentially with dedicated sub-timelines
    findingsList.forEach((finding, idx) => {
      const startTime = 4.35 + idx * 0.18;
      tl.to(`#row-divider-${finding.id}`, { scaleX: 1, duration: 0.3, ease: "power3.inOut" }, startTime)
        .to(`#finding-row-${finding.id}`, { opacity: 1, y: 0, duration: 0.25 }, startTime + 0.05)
        .to(`#finding-row-${finding.id} .row-title-mask .mask-child`, { yPercent: 0, duration: 0.25 }, startTime + 0.08);
    });

    // 5.30s - Status completes
    tl.call(() => setActiveStatusText("Audit complete"), undefined, 5.3);

    // 5.70s - Automatically highlight CORS issue and open drawer
    tl.call(() => {
      openDrawerForFinding(findingsList[1]); // CORS issue
    }, undefined, 5.8);

    mainTimelineRef.current = tl;
  });

  const openDrawerForFinding = contextSafe((finding: FindingItem) => {
    setSelectedFinding(finding);
    setDrawerOpen(true);

    // Animate drawer sliding from right
    gsap.fromTo(
      ".drawer-panel",
      { xPercent: 100, opacity: 0 },
      { xPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" }
    );

    // Animate content hierarchy inside drawer
    gsap.fromTo(
      ".drawer-content-item",
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, stagger: 0.06, duration: 0.35, ease: "power2.out", delay: 0.1 }
    );
  });

  const closeDrawer = contextSafe(() => {
    gsap.to(".drawer-panel", {
      xPercent: 100,
      opacity: 0,
      duration: 0.3,
      ease: "power3.in",
      onComplete: () => {
        setDrawerOpen(false);
        setSelectedFinding(null);
      },
    });
  });

  // Auto start scan on mount for preview
  useEffect(() => {
    const timer = setTimeout(() => {
      runScan("example.com");
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="w-full py-16 md:py-24 bg-[#faf9f6]">
      <div className="mx-auto max-w-[1150px] px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="mb-10 text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wider text-stone-600 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Interactive Product Preview
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            See the Real Dashboard in Action
          </h2>
          <p className="font-content text-sm sm:text-base text-slate-600 leading-relaxed">
            Experience how our unified website scanner audits your attack surfaces, graphs risk metrics, and serves actionable configuration fixes.
          </p>
        </div>

        {/* Master Application Window Container */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-2xl border border-stone-300/80 bg-[#f8fafc] shadow-[0_12px_40px_-8px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.05)]"
        >
          {/* Window Chrome Titlebar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-stone-100/80 border-b border-stone-200 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-stone-300" />
              <span className="size-2.5 rounded-full bg-stone-300" />
              <span className="size-2.5 rounded-full bg-stone-300" />
              <span className="ml-2 font-mono text-[11px] text-stone-400">app.scanlyst.dev/dashboard</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-stone-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Production Audit v2.4</span>
            </div>
          </div>

          {/* Application Body: Sidebar + Main Content */}
          <div className="flex min-h-[640px] relative">
            {/* LEFT: Compact Application Sidebar (hidden on small mobile) */}
            <aside className="hidden md:flex w-48 shrink-0 flex-col justify-between border-r border-stone-200/90 bg-white p-3.5">
              <div className="space-y-5">
                {/* Brand Logo */}
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="size-6 rounded-md bg-slate-950 flex items-center justify-center text-white">
                    <Shield className="size-3.5" />
                  </div>
                  <span className="font-heading font-bold text-sm text-slate-900 tracking-tight">Scanlyst</span>
                </div>

                {/* Nav Section: Overview */}
                <div className="space-y-1">
                  <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">Overview</span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 rounded-lg bg-stone-100/80 px-2 py-1.5 text-xs font-medium text-slate-900">
                      <Layers className="size-3.5 text-slate-700" />
                      <span>Home</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-stone-50">
                      <FileCode2 className="size-3.5 text-slate-400" />
                      <span>Scans</span>
                    </div>
                  </div>
                </div>

                {/* Nav Section: Audit Pillars */}
                <div className="space-y-1">
                  <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">Audit</span>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between rounded-lg bg-rose-50/70 border border-rose-200/60 px-2 py-1.5 text-xs font-semibold text-rose-800">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-3.5 text-rose-600" />
                        <span>Security</span>
                      </div>
                      <span className="size-1.5 rounded-full bg-rose-500" />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-stone-50">
                      <Globe2 className="size-3.5 text-slate-400" />
                      <span>SEO</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-stone-50">
                      <SearchCheck className="size-3.5 text-slate-400" />
                      <span>AEO</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-stone-50">
                      <Zap className="size-3.5 text-slate-400" />
                      <span>Performance</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-stone-50">
                      <Radar className="size-3.5 text-slate-400" />
                      <span>Domain</span>
                    </div>
                  </div>
                </div>

                {/* Nav Section: Operate */}
                <div className="space-y-1">
                  <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">Operate</span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-stone-50">
                      <Radio className="size-3.5 text-slate-400" />
                      <span>Live threats</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-stone-50">
                      <Activity className="size-3.5 text-slate-400" />
                      <span>Monitoring</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Free Project Tier</span>
                <span className="font-mono">1 / 1</span>
              </div>
            </aside>

            {/* RIGHT: Main Project Dashboard */}
            <main className="flex-1 p-4 sm:p-6 space-y-4 overflow-x-hidden bg-[#f8fafc]">
              {/* Top Project Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-stone-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Project Overview</span>
                    <span className="text-stone-300">•</span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700">Production Web</span>
                  </div>
                  <h1 className="font-heading text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    {url || "example.com"}
                  </h1>
                </div>

                {/* URL Input & Run Scan Action */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-stone-300/90 bg-white px-2.5 py-1.5 shadow-2xs">
                    <span className="font-mono text-xs text-slate-400 mr-1 select-none">https://</span>
                    <input
                      type="text"
                      value={url.replace(/^https?:\/\//, "")}
                      onChange={(e) => setUrl(e.target.value.replace(/^https?:\/\//, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") runScan();
                      }}
                      placeholder="example.com"
                      className="font-mono text-xs text-slate-800 outline-none w-28 sm:w-36 bg-transparent"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => runScan()}
                    disabled={scanState === "scanning"}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-85 text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    {scanState === "scanning" ? (
                      <>
                        <span className="size-1.5 rounded-full bg-white animate-pulse" />
                        <span>Scanning...</span>
                      </>
                    ) : scanState === "complete" ? (
                      <>
                        <RotateCcw className="size-3.5" />
                        <span>Replay</span>
                      </>
                    ) : (
                      <>
                        <Play className="size-3 fill-white" />
                        <span>Run Scan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Ticker Banner */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${scanState === "scanning" ? "bg-rose-500 animate-ping" : scanState === "complete" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  <div className="overflow-hidden h-4 flex items-center">
                    <span className="status-text-anim font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-700 block">
                      {activeStatusText}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <span>Engine: Multi-Vector Scanner</span>
                </div>
              </div>

              {/* Primary Score Panel (Hero Widget) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Score Ring & Summary (Left 5 cols) */}
                <div className="md:col-span-5 rounded-xl border border-stone-200/90 bg-white p-5 flex items-center gap-5 shadow-2xs">
                  {/* SVG Circular Score Ring */}
                  <div className="relative flex size-24 shrink-0 items-center justify-center">
                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                      {/* Background track circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="8"
                      />
                      {/* Animated Score Progress stroke (r=44 -> C=276.46) */}
                      <circle
                        ref={scoreRingCircleRef}
                        cx="50"
                        cy="50"
                        r="44"
                        fill="none"
                        stroke={scoreVal !== null && scoreVal >= 80 ? "#10b981" : scoreVal !== null && scoreVal >= 50 ? "#f43f5e" : "#e2e8f0"}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="276.46"
                        strokeDashoffset="276.46"
                      />
                    </svg>

                    {/* Inner Score Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-heading text-2xl font-bold tracking-tight text-slate-900">
                        {scoreVal === null ? "--" : scoreVal}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">/100</span>
                    </div>
                  </div>

                  {/* Score Description */}
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block">Security Health</span>
                    <h2 className="font-heading text-base font-bold text-slate-900 leading-tight">
                      {scoreVal === null ? "Awaiting Audit" : scoreVal >= 80 ? "Healthy Posture" : "Needs Remediation"}
                    </h2>
                    <div className="score-subtext overflow-hidden">
                      <p className="mask-child text-xs text-slate-500">
                        {metric1 !== null ? `${metric1} open findings • Last audit just now` : "Run scan to audit target surfaces"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Metric Cards (Right 7 cols) */}
                <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Metric 1 */}
                  <div id="metric-card-1" className="metric-card rounded-xl border border-stone-200/90 bg-white p-3 flex flex-col justify-between shadow-2xs">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Findings</span>
                    <span className="font-heading text-xl font-bold text-slate-900 mt-2">
                      {metric1 === null ? "--" : metric1}
                    </span>
                    <span className="text-[10px] text-slate-400">Across 8 vectors</span>
                  </div>

                  {/* Metric 2 */}
                  <div id="metric-card-2" className="metric-card rounded-xl border border-stone-200/90 bg-white p-3 flex flex-col justify-between shadow-2xs">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">High / Critical</span>
                    <span className="font-heading text-xl font-bold text-rose-600 mt-2">
                      {metric2 === null ? "--" : metric2}
                    </span>
                    <span className="text-[10px] text-rose-600/80 font-medium">Requires action</span>
                  </div>

                  {/* Metric 3 */}
                  <div id="metric-card-3" className="metric-card rounded-xl border border-stone-200/90 bg-white p-3 flex flex-col justify-between shadow-2xs">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Scan Status</span>
                    <span className="font-heading text-sm font-bold text-slate-900 mt-3 truncate">
                      {metric3 === null ? "--" : metric3}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">20+ checks</span>
                  </div>

                  {/* Metric 4 */}
                  <div id="metric-card-4" className="metric-card rounded-xl border border-stone-200/90 bg-white p-3 flex flex-col justify-between shadow-2xs">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Environments</span>
                    <span className="font-heading text-xl font-bold text-slate-900 mt-2">
                      {metric4 === null ? "--" : metric4}
                    </span>
                    <span className="text-[10px] text-slate-400">Production</span>
                  </div>
                </div>
              </div>

              {/* Charts Row: Score Trend + Findings by Severity */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Score Trend SVG Line Chart */}
                <div className="md:col-span-6 rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-semibold text-slate-800 font-heading">Score Trend</span>
                    <span className="text-[10px] font-mono text-slate-400">Last 5 Scans</span>
                  </div>
                  <div className="h-28 w-full pt-2 flex items-center justify-center relative">
                    <svg className="w-full h-full" viewBox="0 0 260 90" preserveAspectRatio="none">
                      {/* Grid Guide Lines */}
                      <line x1="0" y1="20" x2="260" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="0" y1="50" x2="260" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="0" y1="80" x2="260" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />

                      {/* Drawn Score Path */}
                      <path
                        ref={trendLineRef}
                        d="M 20 68 L 75 56 L 130 64 L 185 42 L 240 48"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data Points */}
                      <circle className="chart-dot" cx="20" cy="68" r="3.5" fill="#ffffff" stroke="#f43f5e" strokeWidth="2" />
                      <circle className="chart-dot" cx="75" cy="56" r="3.5" fill="#ffffff" stroke="#f43f5e" strokeWidth="2" />
                      <circle className="chart-dot" cx="130" cy="64" r="3.5" fill="#ffffff" stroke="#f43f5e" strokeWidth="2" />
                      <circle className="chart-dot" cx="185" cy="42" r="3.5" fill="#ffffff" stroke="#f43f5e" strokeWidth="2" />
                      <circle className="chart-dot" cx="240" cy="48" r="3.5" fill="#ffffff" stroke="#f43f5e" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                {/* Findings by Severity Donut Chart */}
                <div className="md:col-span-6 rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-semibold text-slate-800 font-heading">Findings by Severity</span>
                    <span className="text-[10px] font-mono text-slate-400">36 Total</span>
                  </div>

                  <div className="flex items-center justify-around pt-2">
                    {/* SVG Donut */}
                    <div className="relative size-20 shrink-0">
                      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                        {/* High Segment (rose) */}
                        <circle
                          id="donut-seg-high"
                          className="donut-segment"
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="12"
                          strokeDasharray="238.76"
                          strokeDashoffset="238.76"
                        />
                        {/* Medium Segment (amber) */}
                        <circle
                          id="donut-seg-med"
                          className="donut-segment"
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="12"
                          strokeDasharray="238.76"
                          strokeDashoffset="238.76"
                        />
                        {/* Low Segment (muted emerald) */}
                        <circle
                          id="donut-seg-low"
                          className="donut-segment"
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="12"
                          strokeDasharray="238.76"
                          strokeDashoffset="238.76"
                        />
                        {/* Info Segment (slate) */}
                        <circle
                          id="donut-seg-info"
                          className="donut-segment"
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="12"
                          strokeDasharray="238.76"
                          strokeDashoffset="238.76"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-slate-800">
                        36
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-rose-500" />
                        <span className="text-slate-600 text-[11px]">High (10)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-amber-500" />
                        <span className="text-slate-600 text-[11px]">Med (15)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-600 text-[11px]">Low (6)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-slate-400" />
                        <span className="text-slate-600 text-[11px]">Info (5)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Needs Attention Section (SaaS Findings List) */}
              <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs space-y-2">
                <div className="needs-attention-heading overflow-hidden pb-1.5 border-b border-stone-100 flex items-center justify-between">
                  <span className="mask-child text-xs font-bold font-heading uppercase tracking-wider text-slate-800 block">
                    Needs Attention (Prioritized)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Click row to inspect fix</span>
                </div>

                <div className="divide-y divide-stone-100">
                  {findingsList.map((finding) => {
                    const isSelected = selectedFinding?.id === finding.id;

                    return (
                      <div key={finding.id}>
                        <div
                          id={`row-divider-${finding.id}`}
                          className="finding-row-divider h-px w-full bg-stone-200"
                        />
                        <div
                          id={`finding-row-${finding.id}`}
                          onClick={() => openDrawerForFinding(finding)}
                          className={`finding-row group py-2.5 px-3 flex items-center justify-between transition-colors duration-150 cursor-pointer rounded-lg ${
                            isSelected ? "bg-rose-50/70 border border-rose-200/80" : "hover:bg-stone-50"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Severity Tag */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
                                finding.severity === "HIGH"
                                  ? "bg-rose-100 text-rose-800"
                                  : finding.severity === "MEDIUM"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  finding.severity === "HIGH"
                                    ? "bg-rose-600"
                                    : finding.severity === "MEDIUM"
                                    ? "bg-amber-600"
                                    : "bg-emerald-600"
                                }`}
                              />
                              {finding.severity}
                            </span>

                            {/* Title with Mask Reveal */}
                            <div className="row-title-mask overflow-hidden truncate">
                              <span className="mask-child font-medium text-xs text-slate-900 block truncate">
                                {finding.title}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-[11px] text-slate-400 hidden sm:inline-block">
                              {finding.category}
                            </span>
                            <ChevronRight className="size-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </main>

            {/* Contextual Finding Drawer (Slides from Right on Desktop / Bottom on Mobile) */}
            {drawerOpen && selectedFinding && (
              <div
                className="drawer-panel absolute right-0 top-0 bottom-0 w-full sm:w-[400px] bg-white border-l border-stone-200 shadow-[-8px_0_30px_rgba(15,23,42,0.08)] z-30 p-5 flex flex-col justify-between overflow-y-auto"
              >
                <div className="space-y-4">
                  {/* Drawer Header & Close Button */}
                  <div className="drawer-content-item flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
                          selectedFinding.severity === "HIGH"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {selectedFinding.severity} SEVERITY
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">{selectedFinding.endpoint}</span>
                    </div>
                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="size-6 rounded-md hover:bg-stone-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Finding Title & Description */}
                  <div className="drawer-content-item space-y-1.5">
                    <h3 className="font-heading text-base font-bold text-slate-950">
                      {selectedFinding.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-sans">
                      {selectedFinding.description}
                    </p>
                  </div>

                  {/* Evidence Code Box */}
                  <div className="drawer-content-item space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Detected Evidence
                    </span>
                    <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-2.5 font-mono text-xs text-rose-700 overflow-x-auto">
                      <code>{selectedFinding.evidence}</code>
                    </div>
                  </div>

                  {/* Suggested Remediation Section */}
                  <div className="drawer-content-item space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Suggested Remediation
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <Check className="size-2.5" /> Verified Patch
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-800">
                      {selectedFinding.remediationTitle}
                    </p>

                    {/* Before & After Config Diff */}
                    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden text-xs font-mono shadow-2xs">
                      {/* Before */}
                      <div className="flex items-start gap-2 px-3 py-2 bg-rose-50/60 border-b border-stone-100 text-rose-900">
                        <span className="text-[10px] font-bold text-rose-500 select-none shrink-0 pt-0.5">
                          BEFORE
                        </span>
                        <span className="line-through opacity-85 break-all text-[11px]">
                          {selectedFinding.beforeCode}
                        </span>
                      </div>

                      {/* After */}
                      <div className="flex items-start gap-2 px-3 py-2 bg-emerald-50/60 text-emerald-900">
                        <span className="text-[10px] font-bold text-emerald-600 select-none shrink-0 pt-0.5">
                          AFTER
                        </span>
                        <span className="font-semibold break-all text-[11px]">
                          {selectedFinding.afterCode}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer Action */}
                <div className="drawer-content-item pt-4 border-t border-stone-200 flex items-center justify-between mt-4">
                  <span className="text-[11px] text-slate-400">Ready to patch</span>
                  <button
                    type="button"
                    onClick={() => alert(`Reviewing fix for ${selectedFinding.title}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>Review fix</span>
                    <ExternalLink className="size-3 text-slate-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
