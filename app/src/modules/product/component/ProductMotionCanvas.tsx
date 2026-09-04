"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Terminal, Shield, CheckCircle2, Radio, Activity } from "lucide-react";

interface ScannerNode {
  id: string;
  name: string;
  x: number;
  y: number;
  status: "verified" | "scanning" | "ready";
  latency: number;
}

const TELEMETRY_LOGS = [
  { time: "02:14:01", tag: "TLS 1.3", text: "Cipher TLS_AES_128_GCM_SHA256 verified", type: "success" },
  { time: "02:14:02", tag: "DMARC", text: "SPF & DKIM p=reject anti-spoofing valid", type: "success" },
  { time: "02:14:03", tag: "SUPABASE", text: "Checking public RLS table policies (anon role)", type: "audit" },
  { time: "02:14:04", tag: "CORS", text: "Wildcard origin with credentials: None detected", type: "success" },
  { time: "02:14:05", tag: "SQLI", text: "Probing parameterized queries on /api/v1/search", type: "audit" },
  { time: "02:14:06", tag: "AEO", text: "Schema.org JSON-LD graph verified for GPTBot", type: "success" },
  { time: "02:14:07", tag: "VITALS", text: "LCP 0.8s, INP 18ms, TTFB 140ms recorded", type: "success" },
  { time: "02:14:08", tag: "HEADERS", text: "HSTS max-age=63072000; includeSubDomains active", type: "success" },
];

export default function ProductMotionCanvas({
  className,
}: {
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logIndex, setLogIndex] = useState(0);

  const mouseRef = useRef<{ x: number; y: number; isHovering: boolean }>({
    x: -9999,
    y: -9999,
    isHovering: false,
  });

  // Cycle telemetry feed
  useEffect(() => {
    const interval = setInterval(() => {
      setLogIndex((prev) => (prev + 1) % TELEMETRY_LOGS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
    mouseRef.current.isHovering = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.isHovering = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    let startTime = performance.now();

    // 6 Scanner Telemetry Nodes
    const nodes: ScannerNode[] = [
      { id: "dns", name: "DNS Anti-Spoofing", x: 0.16, y: 0.32, status: "verified", latency: 14 },
      { id: "tls", name: "TLS 1.3 / Cipher", x: 0.44, y: 0.22, status: "verified", latency: 22 },
      { id: "headers", name: "Security Headers", x: 0.78, y: 0.32, status: "scanning", latency: 31 },
      { id: "sqli", name: "Active SQLi / XSS", x: 0.24, y: 0.74, status: "verified", latency: 45 },
      { id: "supabase", name: "BaaS & RLS Policy", x: 0.58, y: 0.78, status: "verified", latency: 28 },
      { id: "aeo", name: "AEO / AI Readiness", x: 0.84, y: 0.70, status: "verified", latency: 19 },
    ];

    const packets = [
      { from: 0, to: 1, progress: 0.1, speed: 0.007 },
      { from: 1, to: 2, progress: 0.4, speed: 0.009 },
      { from: 0, to: 3, progress: 0.7, speed: 0.008 },
      { from: 3, to: 4, progress: 0.2, speed: 0.006 },
      { from: 4, to: 5, progress: 0.5, speed: 0.008 },
      { from: 2, to: 5, progress: 0.8, speed: 0.007 },
      { from: 1, to: 4, progress: 0.3, speed: 0.007 },
    ];

    const render = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const elapsed = (now - startTime) / 1000;

      // 1. Precise Background Dot Matrix
      const spacing = 24;
      ctx.fillStyle = "rgba(226, 232, 240, 0.7)";
      for (let x = spacing / 2; x < w; x += spacing) {
        for (let y = spacing / 2; y < h; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Central Radar Sweep
      const centerX = w * 0.5;
      const centerY = h * 0.5;
      const radarRadius = Math.min(w, h) * 0.42;

      ctx.strokeStyle = "rgba(244, 63, 94, 0.07)";
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1.0].forEach((r) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radarRadius * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Axis crosshairs
      ctx.strokeStyle = "rgba(226, 232, 240, 0.6)";
      ctx.beginPath();
      ctx.moveTo(centerX - radarRadius, centerY);
      ctx.lineTo(centerX + radarRadius, centerY);
      ctx.moveTo(centerX, centerY - radarRadius);
      ctx.lineTo(centerX, centerY + radarRadius);
      ctx.stroke();

      // Rotating sweep gradient
      const sweepAngle = (elapsed * 1.1) % (Math.PI * 2);
      const gradient = ctx.createConicGradient(sweepAngle, centerX, centerY);
      gradient.addColorStop(0, "rgba(244, 63, 94, 0.12)");
      gradient.addColorStop(0.12, "rgba(244, 63, 94, 0.0)");
      gradient.addColorStop(1, "rgba(244, 63, 94, 0.0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Connective Vectors
      const connections: [number, number][] = [
        [0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5], [1, 4]
      ];

      connections.forEach(([i, j]) => {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const p1x = n1.x * w;
        const p1y = n1.y * h;
        const p2x = n2.x * w;
        const p2y = n2.y * h;

        ctx.strokeStyle = "rgba(203, 213, 225, 0.75)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 4. Moving Packets
      packets.forEach((pkt) => {
        pkt.progress = (pkt.progress + pkt.speed) % 1;
        const n1 = nodes[pkt.from];
        const n2 = nodes[pkt.to];
        const px = n1.x * w + (n2.x * w - n1.x * w) * pkt.progress;
        const py = n1.y * h + (n2.y * h - n1.y * h) * pkt.progress;

        ctx.fillStyle = "rgba(244, 63, 94, 0.95)";
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(244, 63, 94, 0.25)";
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw Interactive Nodes
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const isHovering = mouseRef.current.isHovering;

      nodes.forEach((node) => {
        const nx = node.x * w;
        const ny = node.y * h;
        const dist = Math.sqrt((nx - mouseX) ** 2 + (ny - mouseY) ** 2);
        const isNear = isHovering && dist < 85;

        const pulse = Math.sin(elapsed * 3 + node.latency) * 1.5;
        const baseRadius = isNear ? 9.5 : 7;

        // Aura
        ctx.fillStyle = isNear ? "rgba(244, 63, 94, 0.18)" : "rgba(244, 63, 94, 0.08)";
        ctx.beginPath();
        ctx.arc(nx, ny, baseRadius + 6 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Node Body
        ctx.fillStyle = isNear ? "#f43f5e" : "#0f172a";
        ctx.beginPath();
        ctx.arc(nx, ny, baseRadius, 0, Math.PI * 2);
        ctx.fill();

        // Center Status
        ctx.fillStyle = node.status === "scanning" ? "#f59e0b" : "#10b981";
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Label Tag
        ctx.font = "600 11px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const textY = ny + baseRadius + 8;
        const nameText = node.name;
        const textWidth = ctx.measureText(nameText).width;

        ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
        ctx.strokeStyle = isNear ? "rgba(244, 63, 94, 0.5)" : "rgba(226, 232, 240, 0.9)";
        ctx.lineWidth = 1;

        const padX = 7;
        const padY = 3.5;
        ctx.beginPath();
        ctx.roundRect(
          nx - textWidth / 2 - padX,
          textY - padY,
          textWidth + padX * 2,
          17 + padY,
          5
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isNear ? "#0f172a" : "#475569";
        ctx.fillText(nameText, nx, textY);

        if (isNear) {
          ctx.font = "600 10px monospace";
          ctx.fillStyle = "#f43f5e";
          ctx.fillText(`● ${node.latency}ms ping · active`, nx, textY + 18);
        }
      });

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const activeLog = TELEMETRY_LOGS[logIndex];

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative w-full rounded-2xl border border-stone-200/90 bg-white shadow-2xs overflow-hidden",
        className
      )}
    >
      {/* Canvas Area */}
      <div className="relative w-full h-[260px] sm:h-[310px] cursor-crosshair">
        <canvas ref={canvasRef} className="size-full block" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-4 pointer-events-none flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full border border-stone-200/80 shadow-2xs">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Autonomous Scan Topology</span>
        </div>

        <div className="absolute top-3.5 right-4 pointer-events-none hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full border border-stone-200/80 shadow-2xs">
          <Activity className="size-3 text-rose-500" />
          <span>6 Active Probes</span>
          <span className="text-stone-300">•</span>
          <span className="text-emerald-600 font-semibold">0 False Positives</span>
        </div>
      </div>

      {/* Real-time Telemetry Terminal Ticker at Bottom */}
      <div className="px-4 py-2.5 bg-[#fafaf9] border-t border-stone-200/70 flex items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-stone-400 shrink-0">
            <Terminal className="size-3.5" />
            <span className="text-[10px] uppercase font-bold text-stone-500">Live Probe</span>
          </div>

          <div className="h-3 w-px bg-stone-200 shrink-0" />

          {/* Animated Log Entry */}
          <div className="flex items-center gap-2 truncate text-slate-700">
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 shrink-0">
              [{activeLog.tag}]
            </span>
            <span className="truncate text-[11.5px] text-slate-600">
              {activeLog.text}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-600 shrink-0 font-medium">
          <CheckCircle2 className="size-3" />
          <span>Continuous Health: 100%</span>
        </div>
      </div>
    </div>
  );
}
