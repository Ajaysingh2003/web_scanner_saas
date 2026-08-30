"use client";

/**
 * InteractiveStepOne — "Add your website" graphic.
 *
 * Dependencies: gsap, @gsap/react, lucide-react.
 * `toast` from "sonner" is optional — remove the import and the one call
 * inside handleRunScan if you don't have sonner wired up.
 *
 * Assumes your project already defines `font-heading` / `font-content`
 * utility classes, per your existing frontend setup — swap for plain
 * font classes if not.
 */

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Shield, Globe, Zap, Search, Check, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";


gsap.registerPlugin(useGSAP);

type PillarKey = "security" | "domain" | "performance" | "aeo";

const PILLARS: { key: PillarKey; label: string; icon: typeof Shield }[] = [
  { key: "security", label: "Security", icon: Shield },
  { key: "domain", label: "Domain/DNS", icon: Globe },
  { key: "performance", label: "Core Vitals", icon: Zap },
  { key: "aeo", label: "AEO / AI", icon: Search },
];

export function InteractiveStepOne() {
  const [customUrl, setCustomUrl] = useState("scanlyst.dev");
  const [isScanning, setIsScanning] = useState(false);
  const [activePillars, setActivePillars] = useState<Record<PillarKey, boolean>>({
    security: true,
    domain: true,
    performance: true,
    aeo: true,
  });

  const headerLabelRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const inputBoxRef = useRef<HTMLDivElement>(null);
  const pillarsHeaderRef = useRef<HTMLDivElement>(null);
  const pillarRefs = useRef<Record<PillarKey, HTMLButtonElement | null>>({
    security: null,
    domain: null,
    performance: null,
    aeo: null,
  });
  const footerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const pillarEls = PILLARS.map((p) => pillarRefs.current[p.key]);
    const els = [
      headerLabelRef.current,
      badgeRef.current,
      titleRef.current,
      descRef.current,
      inputBoxRef.current,
      pillarsHeaderRef.current,
      ...pillarEls,
      footerRef.current,
    ];

    if (prefersReducedMotion) {
      gsap.set(els, { opacity: 1, y: 0, scaleX: 1 });
      return;
    }

    gsap.set(els, { opacity: 0, y: 8 });
    gsap.set(inputBoxRef.current, { scaleX: 0.94, transformOrigin: "left center" });
    gsap.set(pillarEls, { y: 6, scale: 0.96 });

    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(headerLabelRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" })
      .to(badgeRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.2")
      .to(titleRef.current, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.15")
      .to(descRef.current, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, "-=0.2")
      .to(
        inputBoxRef.current,
        { opacity: 1, y: 0, scaleX: 1, duration: 0.5, ease: "power3.out" },
        "-=0.1"
      )
      .to(pillarsHeaderRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.15")
      .to(
        pillarEls,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.35,
          ease: "back.out(1.7)",
          stagger: 0.06,
        },
        "-=0.1"
      )
      .to(footerRef.current, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, "-=0.1");

    return () => {
      tl.kill();
    };
  }, []);

  const handleRunScan = () => {
    setIsScanning(true);
    toast.success(`Initializing scan for https://${customUrl.replace(/^https?:\/\//, "")}`);

    // subtle click feedback on the input frame
    gsap.fromTo(
      inputBoxRef.current,
      { scale: 0.99 },
      { scale: 1, duration: 0.3, ease: "power2.out" }
    );

    setTimeout(() => setIsScanning(false), 2000);
  };

  const togglePillar = (key: PillarKey) => {
    setActivePillars((prev) => ({ ...prev, [key]: !prev[key] }));

    const el = pillarRefs.current[key];
    if (el) {
      gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.25, ease: "back.out(2)" });
    }
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span
            ref={headerLabelRef}
            className="font-mono text-[10px] uppercase tracking-widest text-slate-400"
          >
            Step 01 — Target specification
          </span>
          <span
            ref={badgeRef}
            className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-semibold"
          >
            Ready to input
          </span>
        </div>
        <h4 ref={titleRef} className="font-heading text-lg font-bold text-slate-900">
          Add your website
        </h4>
        <p ref={descRef} className="font-content text-xs text-slate-500">
          Type any domain or production staging endpoint to configure your audit scope:
        </p>
      </div>

      {/* Interactive URL input box */}
      <div className="my-auto space-y-3">
        <div
          ref={inputBoxRef}
          className="relative flex items-center rounded-xl border border-stone-300/90 bg-stone-50/70 p-1.5 shadow-2xs focus-within:border-rose-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-100 transition-all"
        >
          <div className="flex items-center gap-1 rounded-lg bg-white border border-stone-200 px-2.5 py-1.5 font-mono text-xs text-slate-600 shrink-0 shadow-2xs">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>HTTPS</span>
          </div>

          <div className="flex items-center flex-1 px-2.5 font-mono text-xs sm:text-sm text-slate-900">
            <span className="text-slate-400 select-none mr-0.5">https://</span>
            <input
              type="text"
              value={customUrl.replace(/^https?:\/\//, "")}
              onChange={(e) => setCustomUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRunScan();
              }}
              placeholder="your-domain.com"
              className="w-full bg-transparent border-none outline-none font-mono text-xs sm:text-sm text-slate-900 placeholder:text-stone-300 font-semibold"
            />
          </div>

          <button
            type="button"
            onClick={handleRunScan}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 rounded-lg  disabled:opacity-80 text-white px-3.5 py-2 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0 bg-background-btn"
          >
            {isScanning ? (
              <>
                <span className="size-2 rounded-full bg-white animate-pulse" />
                <span>Auditing...</span>
              </>
            ) : (
              <>
                <span>Run scan</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Interactive scope checkboxes */}
        <div ref={pillarsHeaderRef} className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Select audit vectors:
          </span>
          <span className="text-[11px] font-mono text-rose-600 font-medium">
            {Object.values(activePillars).filter(Boolean).length}/4 active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PILLARS.map((item) => {
            const isChecked = activePillars[item.key];
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                ref={(el) => {
                  pillarRefs.current[item.key] = el;
                }}
                type="button"
                onClick={() => togglePillar(item.key)}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                  isChecked
                    ? "border-emerald-200 bg-emerald-50/60 text-emerald-800 font-semibold shadow-2xs"
                    : "border-stone-200 bg-white text-slate-400 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Icon className="size-3 shrink-0" />
                  <span className="truncate text-[11px]">{item.label}</span>
                </div>
                <div
                  className={`size-3.5 rounded flex items-center justify-center border ${
                    isChecked
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-stone-300 bg-white"
                  }`}
                >
                  {isChecked && <Check className="size-2.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer info */}
      <div
        ref={footerRef}
        className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-slate-500 font-mono"
      >
        <span>Non-intrusive passive probes</span>
        <span className="text-slate-400">Zero downtime risk</span>
      </div>
    </div>
  );
}