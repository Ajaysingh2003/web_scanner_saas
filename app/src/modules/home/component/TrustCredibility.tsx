import React, { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  Eye,
  FileSearch,
  Lock,
  RefreshCw,
  Layers,
  ShieldCheck,
  Globe2,
  Zap,
  Search,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Palette {
  text: string;
  bg: string;
  border: string;
  dot: string;
}

const PALETTES: Record<string, Palette> = {
  sky: {
    text: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200/80",
    dot: "bg-sky-500",
  },
  amber: {
    text: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200/80",
    dot: "bg-amber-500",
  },
  violet: {
    text: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200/80",
    dot: "bg-violet-500",
  },
  emerald: {
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  rose: {
    text: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200/80",
    dot: "bg-rose-500",
  },
};

interface ManifestEntry {
  id: string;
  number: string;
  title: string;
  summary: string;
  expandedDetail: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof PALETTES;
}

interface Pillar {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof PALETTES;
}

const principlesData = [
  {
    number: "01",
    title: "Passive-first scanning",
    description:
      "Inspect public-facing configuration and behavior without making intrusive changes or burdening servers.",
    color: "sky" as const,
  },
  {
    number: "02",
    title: "Evidence with every finding",
    description:
      "Every issue includes the context behind it so technical teams understand exactly why it was flagged.",
    color: "amber" as const,
  },
  {
    number: "03",
    title: "Remediation you can review",
    description:
      "Fix guidance is transparent, specific, and designed to be verified before you apply it to production.",
    color: "violet" as const,
  },
];

const manifestData: ManifestEntry[] = [
  {
    id: "passive-scan",
    number: "01",
    title: "Passive-first scanning",
    summary:
      "We inspect publicly accessible surfaces and configuration without altering your site or modifying application state.",
    expandedDetail:
      "Our engine uses read-only probes that mirror standard client requests. We do not inject malicious payloads, brute-force forms, or attempt destructive operations.",
    tag: "Passive",
    icon: Eye,
    color: "sky",
  },
  {
    id: "evidence-finding",
    number: "02",
    title: "Evidence with every finding",
    summary:
      "Each issue includes the request, response, signal, or rule that triggered the result.",
    expandedDetail:
      "You receive raw HTTP header values, DNS record digests, or DOM selectors alongside the finding. No opaque scores without verifiable data.",
    tag: "Evidence",
    icon: FileSearch,
    color: "amber",
  },
  {
    id: "no-blind-fixes",
    number: "03",
    title: "No blind fixes",
    summary: "Recommended changes are shown clearly before implementation.",
    expandedDetail:
      "We provide unified before/after configuration diffs with explanatory reasoning, so engineering teams keep full oversight before deploying patches.",
    tag: "Reviewable",
    icon: Lock,
    color: "violet",
  },
  {
    id: "continuous-verification",
    number: "04",
    title: "Continuous verification",
    summary:
      "Resolved issues can be rechecked and monitored over time for regressions.",
    expandedDetail:
      "Once a patch is deployed, one-click re-tests verify the vulnerability is closed, and background schedules confirm changes stay in place.",
    tag: "Recheckable",
    icon: RefreshCw,
    color: "emerald",
  },
  {
    id: "clear-scope",
    number: "05",
    title: "Clear scan scope",
    summary:
      "You can see exactly what was evaluated across security, domain, performance, and discoverability layers.",
    expandedDetail:
      "Every audit itemizes all evaluated checkpoints — both passed items and active findings — so you have complete visibility into assessment coverage.",
    tag: "Transparent",
    icon: Layers,
    color: "rose",
  },
];

const pillarsData: Pillar[] = [
  { label: "Security", icon: ShieldCheck, color: "sky" },
  { label: "Domain", icon: Globe2, color: "violet" },
  { label: "Performance", icon: Zap, color: "amber" },
  { label: "Discoverability", icon: Search, color: "rose" },
];

export default function TrustCredibility() {
  const [expandedId, setExpandedId] = useState<string | null>("passive-scan");
  const sectionRef = useRef<HTMLElement>(null);
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { contextSafe } = useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(".tc-anim", { opacity: 1, y: 0 });
        gsap.set(".tc-mask-child", { yPercent: 0 });
        return;
      }

      gsap.set(".tc-eyebrow", { opacity: 0, y: 8 });
      gsap.set(".tc-mask-child", { yPercent: 110 });
      gsap.set(".tc-support", { opacity: 0, y: 12 });
      gsap.set(".tc-principle", { opacity: 0, y: 10 });
      gsap.set(".tc-cta", { opacity: 0, y: 8 });
      gsap.set(".tc-manifest-frame", { opacity: 0, y: 16, scale: 0.98 });
      gsap.set(".tc-manifest-row", { opacity: 0, y: 8 });
      gsap.set(".tc-pillar-chip", { opacity: 0, scale: 0.9 });
      gsap.set(".tc-signature", { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
        },
        defaults: { ease: "power3.out" },
      });

      tl.to(".tc-eyebrow", { opacity: 1, y: 0, duration: 0.4 })
        .to(
          ".tc-headline .tc-mask-child",
          { yPercent: 0, duration: 0.5, stagger: 0.08 },
          "-=0.2",
        )
        .to(".tc-support", { opacity: 1, y: 0, duration: 0.45 }, "-=0.25")
        .to(
          ".tc-principle",
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 },
          "-=0.2",
        )
        .to(".tc-cta", { opacity: 1, y: 0, duration: 0.35 }, "-=0.15")
        .to(
          ".tc-manifest-frame",
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power4.out" },
          "-=0.45",
        )
        .to(
          ".tc-manifest-row",
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.07 },
          "-=0.3",
        )
        .to(
          ".tc-pillar-chip",
          { opacity: 1, scale: 1, duration: 0.3, stagger: 0.05 },
          "-=0.15",
        )
        .to(".tc-signature", { opacity: 1, duration: 0.4 }, "-=0.1");
    },
    { scope: sectionRef },
  );

  const toggleRow = contextSafe((id: string) => {
    const isOpening = expandedId !== id;
    const nextId = isOpening ? id : null;

    if (expandedId && detailRefs.current[expandedId]) {
      gsap.to(detailRefs.current[expandedId], {
        height: 0,
        opacity: 0,
        duration: 0.25,
        ease: "power2.inOut",
      });
    }

    if (nextId && detailRefs.current[nextId]) {
      gsap.fromTo(
        detailRefs.current[nextId],
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.35, ease: "power3.out" },
      );
    }

    setExpandedId(nextId);
  });

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-20 md:py-28 mt-20 overflow-hidden bg-[#fafaf9] border-t border-b border-stone-200/80"
    >
      {/* soft gradient wash — three low-opacity blurred blobs, not a hard gradient fill */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 size-[420px] rounded-full bg-sky-200/25 blur-[110px]" />
        <div className="absolute top-1/3 -right-32 size-[460px] rounded-full bg-rose-200/25 blur-[120px]" />
        <div className="absolute -bottom-32 left-1/4 size-[380px] rounded-full bg-amber-200/20 blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* ---------------------------------------------------------- */}
          {/* LEFT — narrative                                            */}
          {/* ---------------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-9">
            <div className="space-y-3.5">
              <div className="tc-eyebrow inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wider text-stone-600 shadow-2xs">
                <span className="size-1.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500" />
                Trust &amp; technical credibility
              </div>

              <div className="tc-headline overflow-hidden">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-[1.18]">
                  <span className="tc-mask-child block">
                    Built to inspect your site
                  </span>
                  {/* <span className="tc-mask-child block italic font-medium font-serif bg-gradient-to-r from-rose-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
                    — not interfere with it.
                  </span> */}

                  {/* Option 3 — Rose → white subtle gradient */}
                  <span className="tc-mask-child block italic font-medium font-serif bg-gradient-to-r from-rose-400 to-white/70 bg-clip-text text-transparent">
                    — not interfere with it.
                  </span>
                </h2>
              </div>

              <p className="tc-support font-content text-base text-slate-600 leading-relaxed pt-1">
                Scanlyst analyzes your public attack surface, configuration,
                domain health, performance, and search readiness without
                disrupting your production website.
              </p>
            </div>

            {/* Principles — plain numbered list, each number tinted by its color */}
            <div className="space-y-5 border-t border-stone-200/70 pt-6">
              {principlesData.map((p) => {
                const pal = PALETTES[p.color];
                return (
                  <div
                    key={p.number}
                    className="tc-principle flex items-start gap-4"
                  >
                    <span
                      className={`font-mono text-[11px] font-semibold mt-0.5 shrink-0 tabular-nums ${pal.text}`}
                    >
                      {p.number}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-heading text-sm font-semibold text-slate-900">
                        {p.title}
                      </h4>
                      <p className="font-content text-xs text-slate-500 leading-relaxed mt-0.5">
                        {p.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="tc-cta">
              <a
                href="#demo"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-rose-600 transition-colors group cursor-pointer"
              >
                <span>See how findings are explained</span>
                <ArrowRight className="size-3.5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
              </a>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* RIGHT — the manifest artifact, color-coded per row          */}
          {/* ---------------------------------------------------------- */}
          <div className="lg:col-span-7">
            <div className="tc-manifest-frame rounded-2xl border border-stone-200/90 bg-white shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
              {/* Window chrome titlebar — gradient hairline instead of flat border */}
              <div className="relative flex items-center justify-between px-5 py-3 bg-stone-50/80">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-sky-400" />
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="size-2 rounded-full bg-rose-400" />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-slate-600">
                    manifest.audit
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  Standard v2.4
                </span>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-sky-300 via-amber-300 to-rose-300" />
              </div>

              {/* Numbered manifest entries, each tinted by its color */}
              <div className="divide-y divide-stone-100">
                {manifestData.map((row) => {
                  const isExpanded = expandedId === row.id;
                  const Icon = row.icon;
                  const pal = PALETTES[row.color];

                  return (
                    <div
                      key={row.id}
                      onClick={() => toggleRow(row.id)}
                      className={`tc-manifest-row group px-5 py-4 transition-colors duration-150 cursor-pointer ${
                        isExpanded
                          ? pal.bg + "/40"
                          : "bg-white hover:bg-stone-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <span
                            className={`font-mono text-[11px] font-semibold mt-0.5 shrink-0 tabular-nums transition-colors ${
                              isExpanded ? pal.text : "text-stone-300"
                            }`}
                          >
                            {row.number}
                          </span>

                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex size-5 items-center justify-center rounded-md border shrink-0 transition-colors ${
                                  isExpanded
                                    ? `${pal.bg} ${pal.border} ${pal.text}`
                                    : "bg-stone-50 border-stone-200 text-stone-400"
                                }`}
                              >
                                <Icon className="size-3" />
                              </div>
                              <h3 className="font-heading text-sm font-semibold text-slate-900 leading-snug">
                                {row.title}
                              </h3>
                            </div>
                            <p className="font-content text-xs text-slate-600 leading-relaxed pl-[28px]">
                              {row.summary}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <span
                            className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${pal.bg} ${pal.border} ${pal.text}`}
                          >
                            {row.tag}
                          </span>
                          <ChevronDown
                            className={`size-3.5 text-stone-400 transition-transform duration-200 ${
                              isExpanded
                                ? `rotate-180 ${pal.text}`
                                : "group-hover:text-slate-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div
                        ref={(el) => {
                          detailRefs.current[row.id] = el;
                        }}
                        style={{ height: isExpanded ? "auto" : 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 pl-[44px] pr-2">
                          <div
                            className={`p-3 rounded-lg border text-[11px] font-mono leading-relaxed ${pal.bg} ${pal.border} text-slate-600`}
                          >
                            <span className="font-bold text-slate-800 block mb-0.5">
                              Technical principle:
                            </span>
                            {row.expandedDetail}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scope pillars — each chip tinted by its own color */}
              <div className="px-5 py-4 border-t border-stone-200/80 bg-stone-50/50">
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 block mb-2.5">
                  Scope covered
                </span>
                <div className="flex flex-wrap gap-2">
                  {pillarsData.map((pillar) => {
                    const Icon = pillar.icon;
                    const pal = PALETTES[pillar.color];
                    return (
                      <span
                        key={pillar.label}
                        className={`tc-pillar-chip inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${pal.bg} ${pal.border} ${pal.text}`}
                      >
                        <Icon className="size-3.5" />
                        {pillar.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Signature footer — gradient hairline echoes the titlebar */}
              <div className="tc-signature relative flex items-center justify-between px-5 py-3 bg-white">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-sky-200 via-amber-200 to-rose-200" />
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span className="font-mono text-[10px] text-slate-500">
                    Verified by Scanlyst Engine
                  </span>
                </div>
                <span className="font-mono text-[10px] text-stone-400 tabular-nums">
                  SHA256 4F91…A2C0
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
