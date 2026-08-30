"use client";

/**
 * InteractiveStepThree — "Understand what needs attention" graphic.
 *
 * Dependencies: gsap, @gsap/react.
 * Assumes your project already defines a `font-heading` utility class,
 * per your existing frontend setup — swap for a plain font class if not.
 */

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ChevronRight } from "lucide-react";

gsap.registerPlugin(useGSAP);

interface Finding {
  id: string;
  sev: "HIGH" | "MED";
  title: string;
  endpoint: string;
  cvss: string;
  description: string;
  isHigh: boolean;
}

const FINDINGS: Finding[] = [
  {
    id: "cors",
    sev: "HIGH",
    title: "CORS wildcard origin",
    endpoint: "/config/api",
    cvss: "8.2",
    description:
      "Access-Control-Allow-Origin: * permits unauthorized websites to invoke authenticated APIs.",
    isHigh: true,
  },
  {
    id: "csp",
    sev: "HIGH",
    title: "Missing security policy",
    endpoint: "Header: CSP",
    cvss: "7.5",
    description:
      "No Content-Security-Policy header defined. Client scripts can be injected via reflected XSS.",
    isHigh: true,
  },
  {
    id: "ratelimit",
    sev: "MED",
    title: "Missing rate limiting",
    endpoint: "/api/v1/auth",
    cvss: "5.3",
    description:
      "Auth route allows unlimited credential attempts without sliding-window throttle.",
    isHigh: false,
  },
];

export function InteractiveStepThree() {
  const [selectedFindingId, setSelectedFindingId] = useState<string>("cors");

  const badgeIconRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLSpanElement>(null);
  const actionBadgeRef = useRef<HTMLSpanElement>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const footerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const rowEls = FINDINGS.map((f) => rowRefs.current[f.id]);
    const els = [
      badgeIconRef.current,
      titleRef.current,
      subtitleRef.current,
      actionBadgeRef.current,
      ...rowEls,
      footerRef.current,
    ];

    if (prefersReducedMotion) {
      gsap.set(els, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    gsap.set(els, { opacity: 0, y: 8 });
    gsap.set(badgeIconRef.current, { scale: 0.6 });
    gsap.set(rowEls, { y: 10 });

    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(badgeIconRef.current, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.4,
      ease: "back.out(2)",
    })
      .to(titleRef.current, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, "-=0.25")
      .to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.2")
      .to(actionBadgeRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.25")
      .to(
        rowEls,
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out", stagger: 0.09 },
        "-=0.1"
      )
      .to(footerRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.15");

    return () => {
      tl.kill();
    };
  }, []);

  const handleSelect = (id: string) => {
    setSelectedFindingId(id);
    const el = rowRefs.current[id];
    if (el) {
      gsap.fromTo(el, { scale: 0.985 }, { scale: 1, duration: 0.25, ease: "power2.out" });
    }
  };

  const activeFinding = FINDINGS.find((f) => f.id === selectedFindingId) ?? FINDINGS[0];

  return (
    <div className="flex flex-col justify-between h-full space-y-3 p-5">
      {/* Top header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div
            ref={badgeIconRef}
            className="size-7 rounded-full bg-rose-50 border border-rose-200/80 flex items-center justify-center font-mono font-bold text-xs text-rose-600"
          >
            {FINDINGS.length}
          </div>
          <div>
            <h4 ref={titleRef} className="font-heading text-sm font-bold text-slate-900 leading-tight">
              Issues detected
            </h4>
            <span ref={subtitleRef} className="font-mono text-[10px] text-slate-400">
              Ranked by exploitability
            </span>
          </div>
        </div>
        <span
          ref={actionBadgeRef}
          className="font-mono text-[10px] uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60 font-semibold"
        >
          Action required
        </span>
      </div>

      {/* Clickable triage rows */}
      <div className="space-y-1.5 my-auto">
        {FINDINGS.map((item) => {
          const isSelected = item.id === selectedFindingId;
          return (
            <div
              key={item.id}
              ref={(el) => {
                rowRefs.current[item.id] = el;
              }}
              onClick={() => handleSelect(item.id)}
              className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                isSelected
                  ? "border-rose-300 bg-rose-50/60 shadow-2xs"
                  : "border-stone-200/80 bg-white hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      item.isHigh ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.sev}
                  </span>
                  <span className="font-semibold text-slate-900 truncate text-xs">
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] text-slate-400 hidden sm:inline-block">
                    {item.endpoint}
                  </span>
                  <ChevronRight
                    className={`size-3.5 text-stone-400 transition-transform ${
                      isSelected ? "rotate-90 text-rose-600" : ""
                    }`}
                  />
                </div>
              </div>

              {isSelected && (
                <div className="mt-2 pt-2 border-t border-rose-200/60 text-[11px] text-slate-600 flex items-center justify-between animate-in fade-in duration-150">
                  <p className="line-clamp-1 flex-1 pr-2">{item.description}</p>
                  <span className="font-mono text-[10px] font-bold text-rose-700 bg-white px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                    CVSS {item.cvss}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div
        ref={footerRef}
        className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono text-slate-400"
      >
        <span>Click row to view evidence &amp; CVSS</span>
        <span className="text-slate-600 font-medium">0 false positives</span>
      </div>
    </div>
  );
}