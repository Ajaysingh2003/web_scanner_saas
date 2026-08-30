"use client";

/**
 * InteractiveStepFive — "Keep watching after the fix" graphic.
 *
 * Dependencies: gsap, @gsap/react, lucide-react.
 * The heartbeat chart keeps its own continuous requestAnimationFrame loop
 * (same pattern as InteractiveStepTwo's scanner), separate from the GSAP
 * entrance that reveals the surrounding chrome.
 *
 * Assumes your project already defines a `font-heading` utility class,
 * per your existing frontend setup — swap for a plain font class if not.
 */

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ChevronRight } from "lucide-react";

gsap.registerPlugin(useGSAP);

type MonitorKey = "web" | "api" | "ssl" | "dns";

const MONITOR_KEYS: MonitorKey[] = ["web", "api", "ssl", "dns"];

const MONITOR_DETAILS: Record<
  MonitorKey,
  { label: string; lastChecked: string; responseTime: string; status: string; color: string }
> = {
  web: {
    label: "Web",
    lastChecked: "12s ago",
    responseTime: "184ms",
    status: "Healthy",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  api: {
    label: "API",
    lastChecked: "8s ago",
    responseTime: "97ms",
    status: "Healthy",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  ssl: {
    label: "SSL Cert",
    lastChecked: "6m ago",
    responseTime: "Expires in 58d",
    status: "Valid",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  dns: {
    label: "DNS",
    lastChecked: "41s ago",
    responseTime: "22ms",
    status: "Healthy",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
};

export function InteractiveStepFive() {
  const [selectedMonitor, setSelectedMonitor] = useState<MonitorKey | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotionRef = useRef(false);

  const headerLabelRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const uptimeRef = useRef<HTMLDivElement>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const stripHeaderRef = useRef<HTMLDivElement>(null);
  const monitorBtnRefs = useRef<Record<MonitorKey, HTMLButtonElement | null>>({
    web: null,
    api: null,
    ssl: null,
    dns: null,
  });

  /* -------------------------------------------------------------- */
  /* Entrance animation                                                */
  /* -------------------------------------------------------------- */
  useGSAP(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const monitorEls = MONITOR_KEYS.map((k) => monitorBtnRefs.current[k]);
    const els = [
      headerLabelRef.current,
      badgeRef.current,
      uptimeRef.current,
      chartWrapRef.current,
      stripHeaderRef.current,
      ...monitorEls,
    ];

    if (reducedMotionRef.current) {
      gsap.set(els, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    gsap.set(els, { opacity: 0, y: 8 });
    gsap.set(chartWrapRef.current, { scaleY: 0.9, transformOrigin: "top" });
    gsap.set(monitorEls, { scale: 0.94 });

    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(headerLabelRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" })
      .to(badgeRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.2")
      .to(uptimeRef.current, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.15")
      .to(
        chartWrapRef.current,
        { opacity: 1, y: 0, scaleY: 1, duration: 0.5, ease: "power3.out" },
        "-=0.15"
      )
      .to(stripHeaderRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.1")
      .to(
        monitorEls,
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.7)", stagger: 0.06 },
        "-=0.1"
      );

    return () => {
      tl.kill();
    };
  }, []);

  /* -------------------------------------------------------------- */
  /* Live heartbeat chart                                             */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const startTime = performance.now();

    const heartbeatY = (t: number, y0: number, amp: number) => {
      const local = t % 1;
      if (local > 0.42 && local < 0.46) return y0 - amp * 0.3;
      if (local >= 0.46 && local < 0.5) return y0 + amp * 0.9;
      if (local >= 0.5 && local < 0.54) return y0 - amp * 0.5;
      return y0;
    };

    const paint = (elapsed: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // calibration lines
      for (let i = 1; i < 3; i++) {
        ctx.strokeStyle = "rgba(15,23,42,0.05)";
        ctx.beginPath();
        ctx.moveTo(6, (h / 3) * i);
        ctx.lineTo(w - 6, (h / 3) * i);
        ctx.stroke();
      }

      // heartbeat trace, scrolling left
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const cyc = elapsed * 0.6;
      const steps = 90;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const t = cyc - (1 - i / steps);
        const y = heartbeatY(t, h / 2, h * 0.36);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // leading dot
      const leadY = heartbeatY(cyc, h / 2, h * 0.36);
      ctx.beginPath();
      ctx.fillStyle = "#e11d48";
      ctx.arc(w - 4, leadY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      paint(elapsed);
      if (reducedMotionRef.current) return;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleSelect = (key: MonitorKey) => {
    setSelectedMonitor((prev) => (prev === key ? null : key));
    const el = monitorBtnRefs.current[key];
    if (el) {
      gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.25, ease: "back.out(2)" });
    }
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-3 p-5">
      <div className="flex items-center justify-between">
        <span
          ref={headerLabelRef}
          className="font-mono text-[10px] uppercase tracking-widest text-slate-400"
        >
          Step 05 — Continuous monitoring
        </span>
        <span
          ref={badgeRef}
          className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-semibold"
        >
          ● Watching
        </span>
      </div>

      <div ref={uptimeRef} className="text-center">
        <span className="font-heading text-2xl font-bold text-slate-900 tabular-nums">
          99.99%
        </span>
        <span className="block font-mono text-[9px] uppercase tracking-widest text-slate-400 mt-0.5">
          Uptime
        </span>
      </div>

      <div
        ref={chartWrapRef}
        className="h-16 rounded-lg border border-stone-200 bg-white overflow-hidden"
      >
        <canvas ref={canvasRef} className="size-full" />
      </div>

      <div className="space-y-1.5 pt-2 border-t border-stone-100">
        <div
          ref={stripHeaderRef}
          className="flex items-center justify-between text-[10px] font-mono text-slate-400"
        >
          <span>Click a monitor to inspect:</span>
          <span>4 endpoints watched</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {MONITOR_KEYS.map((key) => (
            <button
              key={key}
              ref={(el) => {
                monitorBtnRefs.current[key] = el;
              }}
              type="button"
              onClick={() => handleSelect(key)}
              className={`flex items-center justify-center gap-1 p-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                selectedMonitor === key
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-2xs"
                  : "border-stone-200 bg-stone-50/70 text-slate-700 hover:bg-stone-100"
              }`}
            >
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              {MONITOR_DETAILS[key].label}
            </button>
          ))}
        </div>

        {selectedMonitor && (
          <div className="mt-2 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">
                {MONITOR_DETAILS[selectedMonitor].label}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${MONITOR_DETAILS[selectedMonitor].color}`}
              >
                {MONITOR_DETAILS[selectedMonitor].status}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-600">
              <span>Checked {MONITOR_DETAILS[selectedMonitor].lastChecked}</span>
              <span className="font-mono flex items-center gap-1">
                {MONITOR_DETAILS[selectedMonitor].responseTime}
                <ChevronRight className="size-3 text-stone-400" />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
