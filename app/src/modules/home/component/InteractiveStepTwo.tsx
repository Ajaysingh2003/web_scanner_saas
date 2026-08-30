"use client";

/**
 * InteractiveStepTwo — "Scan the attack surface" graphic.
 *
 * Dependencies: gsap, @gsap/react.
 * The canvas itself keeps its own continuous requestAnimationFrame loop
 * (it's meant to feel "live"), driven independently of the GSAP entrance
 * that reveals the surrounding chrome (header, node strip, buttons).
 */

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

type NodeKey = "TLS" | "DNS" | "CORS" | "Exposure";

const NODE_KEYS: NodeKey[] = ["TLS", "DNS", "CORS", "Exposure"];

const NODE_DETAILS: Record<
  NodeKey,
  { title: string; desc: string; status: string; color: string }
> = {
  TLS: {
    title: "TLS / Cipher Chain",
    desc: "TLS 1.3 enforced. Deprecated TLS 1.0/1.1 disabled.",
    status: "Passed (A+)",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  DNS: {
    title: "DNS Authentication",
    desc: "SPF record present. DMARC policy strictly set to p=reject.",
    status: "Protected",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  CORS: {
    title: "CORS Configuration",
    desc: "Access-Control-Allow-Origin contains wildcard '*' allowing all origins.",
    status: "High Risk Detected",
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  Exposure: {
    title: "Public Exposure",
    desc: "No .env, .git, or exposed build sourcemaps discovered.",
    status: "Clean",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
};

export function InteractiveStepTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<NodeKey | null>(null);

  const headerLabelRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const stripHeaderRef = useRef<HTMLDivElement>(null);
  const nodeBtnRefs = useRef<Record<NodeKey, HTMLButtonElement | null>>({
    TLS: null,
    DNS: null,
    CORS: null,
    Exposure: null,
  });

  const reducedMotionRef = useRef(false);

  /* -------------------------------------------------------------- */
  /* Entrance animation for the chrome around the canvas              */
  /* -------------------------------------------------------------- */
  useGSAP(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const nodeEls = NODE_KEYS.map((k) => nodeBtnRefs.current[k]);
    const els = [
      headerLabelRef.current,
      badgeRef.current,
      canvasWrapRef.current,
      stripHeaderRef.current,
      ...nodeEls,
    ];

    if (reducedMotionRef.current) {
      gsap.set(els, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    gsap.set(els, { opacity: 0, y: 8 });
    gsap.set(canvasWrapRef.current, { scale: 0.94 });
    gsap.set(nodeEls, { scale: 0.94 });

    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(headerLabelRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" })
      .to(badgeRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.2")
      .to(
        canvasWrapRef.current,
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out" },
        "-=0.1"
      )
      .to(stripHeaderRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.15")
      .to(
        nodeEls,
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.7)", stagger: 0.06 },
        "-=0.1"
      );

    return () => {
      tl.kill();
    };
  }, []);

  /* -------------------------------------------------------------- */
  /* Live scanning canvas                                             */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const startTime = performance.now();

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

      const cx = w / 2;
      const cy = h / 2;
      const maxR = 75;

      const wave1 = (elapsed * 30) % maxR;
      const wave2 = (elapsed * 30 + maxR / 2) % maxR;
      [wave1, wave2].forEach((r) => {
        const alpha = 1 - r / maxR;
        ctx.strokeStyle = `rgba(225, 29, 72, ${alpha * 0.16})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      [0.45, 0.75, 1.0].forEach((ratio) => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * ratio, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.04)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      const scanAngle = elapsed * 1.8;
      const bx = cx + Math.cos(scanAngle) * maxR;
      const by = cy + Math.sin(scanAngle) * maxR;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = "rgba(225, 29, 72, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, maxR, scanAngle, scanAngle + 0.85);
      ctx.strokeStyle = "#e11d48";
      ctx.lineWidth = 2;
      ctx.stroke();

      const nodes: { key: NodeKey; label: string; angle: number; color: string }[] = [
        { key: "TLS", label: "TLS", angle: -Math.PI * 0.75, color: "#059669" },
        { key: "DNS", label: "DNS", angle: -Math.PI * 0.25, color: "#059669" },
        { key: "CORS", label: "CORS", angle: Math.PI * 0.75, color: "#e11d48" },
        { key: "Exposure", label: "Exposure", angle: Math.PI * 0.25, color: "#059669" },
      ];

      nodes.forEach((n, idx) => {
        const nx = cx + Math.cos(n.angle) * 96;
        const ny = cy + Math.sin(n.angle) * 96;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.stroke();

        const packetProgress = (elapsed * 1.2 + idx * 0.25) % 1;
        const px = cx + (nx - cx) * packetProgress;
        const py = cy + (ny - cy) * packetProgress;
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = selectedNode === n.key ? "#fffdfa" : "#ffffff";
        ctx.strokeStyle = selectedNode === n.key ? n.color : "#e2e8f0";
        ctx.lineWidth = selectedNode === n.key ? 1.5 : 1;
        ctx.beginPath();
        ctx.roundRect(nx - 36, ny - 12, 72, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(nx - 24, ny, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#334155";
        ctx.font = "600 9px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(n.label, nx - 16, ny);
      });

      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      const pct = Math.min(100, Math.floor(64 + ((elapsed * 12) % 36)));
      ctx.fillStyle = "#64748b";
      ctx.font = "600 7.5px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SCAN", cx, cy - 6);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${pct}%`, cx, cy + 6);
    };

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      paint(elapsed);

      // respect reduced motion: draw one settled frame and stop looping
      if (reducedMotionRef.current) return;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [selectedNode]);

  return (
    <div className="flex flex-col justify-between h-full space-y-3 p-5">
      <div className="flex items-center justify-between">
        <span
          ref={headerLabelRef}
          className="font-mono text-[10px] uppercase tracking-widest text-slate-400"
        >
          Step 02 — Attack surface mapping
        </span>
        <span
          ref={badgeRef}
          className="font-mono text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60 font-semibold"
        >
          ● Live probing
        </span>
      </div>

      <div
        ref={canvasWrapRef}
        className="relative h-44 w-full flex items-center justify-center my-auto"
      >
        <canvas ref={canvasRef} className="size-full" />
      </div>

      <div className="space-y-1.5 pt-2 border-t border-stone-100">
        <div
          ref={stripHeaderRef}
          className="flex items-center justify-between text-[10px] font-mono text-slate-400"
        >
          <span>Click node to inspect discovery:</span>
          <span>4 vectors analyzed</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {NODE_KEYS.map((key) => (
            <button
              key={key}
              ref={(el) => {
                nodeBtnRefs.current[key] = el;
              }}
              type="button"
              onClick={() => setSelectedNode(selectedNode === key ? null : key)}
              className={`p-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                selectedNode === key
                  ? "border-rose-300 bg-rose-50 text-rose-700 shadow-2xs"
                  : "border-stone-200 bg-stone-50/70 text-slate-700 hover:bg-stone-100"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {selectedNode && (
          <div className="mt-2 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">
                {NODE_DETAILS[selectedNode].title}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${NODE_DETAILS[selectedNode].color}`}
              >
                {NODE_DETAILS[selectedNode].status}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              {NODE_DETAILS[selectedNode].desc}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}