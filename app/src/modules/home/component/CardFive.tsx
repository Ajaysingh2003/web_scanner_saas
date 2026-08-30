"use client";

import React, { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Radio, Activity, BellRing } from "lucide-react";

export default function CardFive() {
  const [isHover, setIsHover] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Interactive Live Heartbeat / ECG Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    let offset = 0;

    const render = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      offset += isHover ? 3.5 : 1.8;

      // Draw faint grid
      ctx.strokeStyle = "rgba(244, 63, 94, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Generate ECG Heartbeat Line
      ctx.beginPath();
      ctx.strokeStyle = isHover ? "#f43f5e" : "#fb7185";
      ctx.lineWidth = isHover ? 2.4 : 1.8;
      ctx.shadowColor = "rgba(244, 63, 94, 0.5)";
      ctx.shadowBlur = isHover ? 10 : 4;

      const midY = h / 2;
      const cycleWidth = 140;

      for (let x = 0; x < w; x++) {
        const localX = (x + offset) % cycleWidth;
        let y = midY;

        // P-wave, QRS spike, T-wave formula
        if (localX > 40 && localX < 50) {
          y = midY - 6; // P wave
        } else if (localX >= 50 && localX < 54) {
          y = midY + 4; // Q wave
        } else if (localX >= 54 && localX < 62) {
          y = midY - (isHover ? 32 : 24); // R spike
        } else if (localX >= 62 && localX < 68) {
          y = midY + 12; // S dip
        } else if (localX >= 75 && localX < 92) {
          y = midY - 8; // T wave
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pulse leading dot
      const dotX = w - 18;
      const localX = (dotX + offset) % cycleWidth;
      let dotY = midY;
      if (localX > 40 && localX < 50) dotY = midY - 6;
      else if (localX >= 50 && localX < 54) dotY = midY + 4;
      else if (localX >= 54 && localX < 62) dotY = midY - (isHover ? 32 : 24);
      else if (localX >= 62 && localX < 68) dotY = midY + 12;
      else if (localX >= 75 && localX < 92) dotY = midY - 8;

      ctx.beginPath();
      ctx.arc(dotX, dotY, isHover ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = "#f43f5e";
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isHover]);

  // GSAP Hover Setup
  const { contextSafe } = useGSAP(() => {
    gsap.set(glowRef.current, { opacity: 0, scale: 0.6 });

    const tl = gsap.timeline({ paused: true });

    tl.to(cardRef.current, {
      scale: 1.02,
      borderColor: "#fda4af",
      y: -5,
      duration: 0.4,
      ease: "power2.out",
    })
      .to(glowRef.current, { opacity: 0.22, scale: 1, duration: 0.4, ease: "power2.out" }, "<")
      .to(".webhook-chip", {
        scale: 1.04,
        borderColor: "#fecdd3",
        stagger: 0.05,
        duration: 0.3,
        ease: "back.out(1.5)",
      }, "<");

    tlRef.current = tl;
  }, { scope: cardRef });

  const handleMouseEnter = contextSafe(() => {
    setIsHover(true);
    tlRef.current?.timeScale(1).play();
  });

  const handleMouseLeave = contextSafe(() => {
    setIsHover(false);
    tlRef.current?.timeScale(1.5).reverse();
  });

  const handleMouseMove = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !glowRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    gsap.to(glowRef.current, {
      x: x - 120,
      y: y - 120,
      duration: 0.45,
      ease: "power2.out",
    });
  });

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className="relative col-span-6 md:col-span-2 min-h-[400px] w-full cursor-pointer overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#fafafa] shadow-xs transition-shadow hover:shadow-md will-change-transform flex flex-col justify-between"
      style={{
        backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      {/* Interactive Glow */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute left-0 top-0 h-[240px] w-[240px] rounded-full bg-gradient-to-r from-rose-200 to-amber-200 blur-[80px]"
      />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5">
        <span className="inline-flex items-center gap-1.5 rounded-full  px-2.5 py-0.5   text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          <Radio className="size-3 text-rose-500 animate-pulse" />
          24/7 Heartbeat
        </span>
         <div className="mt-0.5 size-2 rounded-full bg-red-500" />
        {/* <div className="flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
          <span>99.99% Up</span>
        </div> */}
      </div>

      {/* Center Heartbeat Canvas & Live Webhook Chips */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center px-4 py-2">
        <div className="relative flex h-24 w-full items-center justify-center">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        </div>

        {/* Webhook Targets */}
        <div className="w-full flex items-center justify-center gap-1.5 mt-3">
          <div className="webhook-chip flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white/80 px-2.5 py-1 text-xs shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-slate-700">Slack</span>
          </div>

          <div className="webhook-chip flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white/80 px-2.5 py-1 text-xs shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span className="text-[11px] font-semibold text-slate-700">Discord</span>
          </div>

          <div className="webhook-chip flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white/80 px-2.5 py-1 text-xs shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span className="text-[11px] font-semibold text-slate-700">MCP API</span>
          </div>
        </div>
      </div>

      {/* Bottom Description */}
      <div className="relative z-10 p-5 pt-0">
        <h3 className="font-serif text-xl font-bold tracking-tight text-slate-900">
          Threat Heartbeat & Alerts
        </h3>
        <p className="font-sans text-xs leading-relaxed text-slate-600 mt-1">
          Automated cron schedules probe endpoints 24/7 and dispatch instant webhook alerts when threats or outages occur.
        </p>
      </div>
    </div>
  );
}
