"use client";

/**
 * AuthAnimation — auth screen side panel.
 *
 * Redesign direction: match the light, tilted, layered "product card"
 * composition from the reference (a blurred ghost of the full app behind
 * a crisp foreground detail card, everything on a plain light backdrop,
 * huge negative space, near-monochrome except one accent color) — but
 * built around a security finding instead of a dev incident.
 *
 * Dependencies: gsap, @gsap/react, lucide-react.
 * Respects prefers-reduced-motion (skips the mouse parallax and the
 * idle float, holds the settled layout).
 */

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ShieldAlert,
  Flag,
  Hash,
  Gauge,
  CircleDot,
  Globe,
  Clock,
  Timer,
  TrendingUp,
} from "lucide-react";

gsap.registerPlugin(useGSAP);

const FIELDS = [
  { label: "Title", value: "CORS wildcard origin", icon: ShieldAlert },
  { label: "ID", value: "SCN-241", icon: Hash },
  { label: "Severity", value: "High", icon: Gauge, accent: true },
  { label: "Status", value: "Open", icon: CircleDot },
  { label: "Surface", value: "/config/api", icon: Globe },
  { label: "First detection", value: "4 hours ago", icon: Clock },
  { label: "Open for", value: "3h 15m 47s", icon: Timer },
];

export default function AuthAnimation() {
  const rootRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const metricRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      gsap.set([ghostRef.current, cardRef.current, metricRef.current], {
        opacity: 0,
        y: 24,
      });

      const tl = gsap.timeline({ delay: 0.1 });
      tl.to(ghostRef.current, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" })
        .to(cardRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
        .to(metricRef.current, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, "-=0.3");

      if (prefersReducedMotion) return;

      // slow idle float, keeps the composition feeling alive without being busy
      gsap.to(cardRef.current, {
        y: "-=6",
        duration: 3.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.2,
      });
      gsap.to(ghostRef.current, {
        y: "-=4",
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1,
      });

      // subtle mouse parallax
      const root = rootRef.current;
      if (!root) return;

      const xToCard = gsap.quickTo(cardRef.current, "rotateY", { duration: 0.6, ease: "power2.out" });
      const yToCard = gsap.quickTo(cardRef.current, "rotateX", { duration: 0.6, ease: "power2.out" });
      const xToGhost = gsap.quickTo(ghostRef.current, "rotateY", { duration: 0.8, ease: "power2.out" });
      const yToGhost = gsap.quickTo(ghostRef.current, "rotateX", { duration: 0.8, ease: "power2.out" });

      const handleMove = (e: MouseEvent) => {
        const rect = root.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;

        xToCard(-10 + px * 6);
        yToCard(4 + py * -6);
        xToGhost(-14 + px * 4);
        yToGhost(6 + py * -4);
      };

      root.addEventListener("mousemove", handleMove);
      return () => root.removeEventListener("mousemove", handleMove);
    },
    { scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      className="relative hidden h-full min-h-screen w-full select-none overflow-hidden bg-[#fafaf9] md:flex flex-col justify-between p-12"
      style={{ perspective: "1600px" }}
    >
      {/* faint dot grid, barely visible */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(rgba(15,23,42,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* ------------------------------------------------------------ */}
      {/* Ghost layer — blurred, faded impression of the full app        */}
      {/* ------------------------------------------------------------ */}
      <div
        ref={ghostRef}
        className="pointer-events-none absolute top-[8%] right-[-8%] w-[78%] h-[62%] rounded-2xl border border-stone-200 bg-white/70 shadow-sm blur-[1.5px] opacity-40"
        style={{ transform: "rotateX(6deg) rotateY(-14deg) rotateZ(2deg)", transformStyle: "preserve-3d" }}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-200">
          <div className="size-6 rounded-md bg-stone-900" />
          <div className="h-2 w-16 rounded bg-stone-200" />
          <div className="h-2 w-24 rounded bg-stone-300" />
        </div>
        <div className="flex gap-6 p-6">
          <div className="flex flex-col gap-3 w-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="size-4 rounded bg-stone-200" />
            ))}
          </div>
          <div className="flex-1 space-y-3">
            <div className="h-4 w-2/3 rounded bg-stone-200" />
            <div className="h-2 w-full rounded bg-stone-100" />
            <div className="h-2 w-5/6 rounded bg-stone-100" />
            <div className="h-2 w-4/6 rounded bg-stone-100" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Foreground — the finding detail card                           */}
      {/* ------------------------------------------------------------ */}
      <div className="relative z-10 my-auto flex flex-col items-center">
        <div className="relative w-full max-w-sm">
          <div
            ref={cardRef}
            className="relative rounded-2xl border border-stone-200 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] p-6"
            style={{ transform: "rotateX(4deg) rotateY(-10deg) rotateZ(-1deg)", transformStyle: "preserve-3d" }}
          >
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-stone-100">
              <div className="flex size-8 items-center justify-center rounded-lg bg-rose-50 border border-rose-200/80 text-rose-600">
                <ShieldAlert className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                  Finding
                </p>
                <h3 className="font-heading text-sm font-bold text-slate-900 truncate">
                  CORS wildcard origin
                </h3>
              </div>
            </div>

            <dl className="space-y-2.5">
              {FIELDS.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="flex items-center justify-between text-xs">
                    <dt className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <Icon className="size-3 shrink-0" />
                      {f.label}
                    </dt>
                    <dd
                      className={`font-mono font-semibold ${
                        f.accent ? "text-rose-600" : "text-slate-700"
                      }`}
                    >
                      {f.value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Metric fragment — peeks out from behind the card, bottom-right */}
          <div
            ref={metricRef}
            className="absolute -bottom-10 -right-8 w-56 rounded-xl border border-stone-200 bg-white shadow-[0_16px_40px_-10px_rgba(15,23,42,0.14)] p-4"
            style={{ transform: "rotateX(3deg) rotateY(-8deg) rotateZ(2deg)", transformStyle: "preserve-3d" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
                Requests at risk
              </span>
              <TrendingUp className="size-3 text-rose-500" />
            </div>
            <p className="font-heading text-lg font-bold text-slate-900 mt-0.5">2,481</p>
            <svg viewBox="0 0 160 32" className="w-full h-8 mt-1.5" preserveAspectRatio="none">
              <polyline
                points="0,26 20,24 40,20 60,22 80,14 100,16 120,8 140,10 160,4"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.5"
              />
              <circle cx="160" cy="4" r="2.5" fill="#e11d48" />
            </svg>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Copy                                                            */}
      {/* ------------------------------------------------------------ */}
      <div className="relative z-10 max-w-sm space-y-2">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900 leading-snug">
          See what&apos;s exposed <br />
          <span className="text-rose-600">before someone else does.</span>
        </h2>
        <p className="font-content text-xs leading-relaxed text-slate-500">
          Continuous security, performance, and compliance audits with plain-language
          remediation steps — not just raw alert logs.
        </p>
      </div>

      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}


