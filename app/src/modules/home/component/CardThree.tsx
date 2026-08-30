"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ShieldCheck, Lock, Check } from "lucide-react";

export default function CardThree() {
  const [isHover, setIsHover] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLDivElement>(null);

  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let frame = 0;
    let angle = -Math.PI / 2;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ctx.clearRect(0, 0, width, height);

      angle += isHover ? 0.015 : 0.006;

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.38;

      /*
       * Crosshair
       */
      ctx.beginPath();

      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);

      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);

      ctx.strokeStyle = "rgba(100, 116, 139, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      /*
       * Concentric rings
       */
      [0.36, 0.68, 1].forEach((ratio, index) => {
        ctx.beginPath();

        ctx.arc(
          cx,
          cy,
          radius * ratio,
          0,
          Math.PI * 2
        );

        ctx.strokeStyle =
          index === 2
            ? "rgba(99, 102, 241, 0.22)"
            : "rgba(100, 116, 139, 0.15)";

        ctx.lineWidth = 1;
        ctx.stroke();
      });

      /*
       * Radar sweep line
       */
      const beamX = cx + Math.cos(angle) * radius;
      const beamY = cy + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(beamX, beamY);

      ctx.strokeStyle = isHover
        ? "rgba(79, 70, 229, 0.72)"
        : "rgba(79, 70, 229, 0.42)";

      ctx.lineWidth = 1.15;
      ctx.stroke();

      /*
       * Short trailing sweep lines
       * instead of a big glowing cone.
       */
      [0.09, 0.18, 0.27].forEach((offset, index) => {
        const trailAngle = angle - offset;

        const x = cx + Math.cos(trailAngle) * radius;
        const y = cy + Math.sin(trailAngle) * radius;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);

        ctx.strokeStyle = `rgba(79, 70, 229, ${
          0.12 - index * 0.025
        })`;

        ctx.lineWidth = 1;
        ctx.stroke();
      });

      /*
       * Security signals
       */
      const signals = [
        {
          x: cx - radius * 0.56,
          y: cy - radius * 0.23,
          color: "#6366f1",
        },
        {
          x: cx + radius * 0.48,
          y: cy - radius * 0.4,
          color: "#10b981",
        },
        {
          x: cx + radius * 0.22,
          y: cy + radius * 0.58,
          color: "#6366f1",
        },
      ];

      signals.forEach((signal, index) => {
        const pulse =
          Math.sin(angle * 2 + index * 1.4) * 0.4;

        ctx.beginPath();

        ctx.arc(
          signal.x,
          signal.y,
          2.2 + pulse,
          0,
          Math.PI * 2
        );

        ctx.fillStyle = signal.color;
        ctx.fill();

        ctx.beginPath();

        ctx.arc(
          signal.x,
          signal.y,
          5.5,
          0,
          Math.PI * 2
        );

        ctx.strokeStyle =
          signal.color === "#10b981"
            ? "rgba(16, 185, 129, 0.16)"
            : "rgba(99, 102, 241, 0.14)";

        ctx.lineWidth = 1;
        ctx.stroke();
      });

      /*
       * Center point
       */
      ctx.beginPath();

      ctx.arc(
        cx,
        cy,
        2.5,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "#4f46e5";
      ctx.fill();

      frame = requestAnimationFrame(render);
    };

    resize();
    render();

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [isHover]);

  const { contextSafe } = useGSAP(
    () => {
      const timeline = gsap.timeline({
        paused: true,
      });

      timeline
        .to(cardRef.current, {
          y: -4,
          boxShadow:
            "0 18px 40px -24px rgba(15, 23, 42, 0.22)",
          duration: 0.42,
          ease: "power3.out",
        })
        .to(
          radarRef.current,
          {
            y: -2,
            duration: 0.42,
            ease: "power3.out",
          },
          "<"
        );

      tlRef.current = timeline;
    },
    {
      scope: cardRef,
    }
  );

  const handleMouseEnter = contextSafe(() => {
    setIsHover(true);
    tlRef.current?.timeScale(1).play();
  });

  const handleMouseLeave = contextSafe(() => {
    setIsHover(false);
    tlRef.current?.timeScale(1.2).reverse();
  });

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="
        relative
        col-span-6
        md:col-span-2
        flex
        min-h-[400px]
        w-full
        cursor-pointer
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-[#fbfbfa]
        shadow-[0_1px_2px_rgba(15,23,42,0.03)]
        will-change-transform
      "
    >
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg  ">
            <ShieldCheck
              className="size-3.5 text-indigo-600"
              strokeWidth={1.8}
            />
          </div>

          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
            DNS Defense
          </span>
        </div>

        <Lock
          className="size-3.5 text-slate-400"
          strokeWidth={1.8}
        />
      </div>

      {/* Radar area */}
      <div
        ref={radarRef}
        className="relative z-10 px-5 pt-3"
      >
        <div className="relative h-[142px] overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Instrument header */}
          <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500" />

            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400">
              Monitoring
            </span>
          </div>

          <div className="absolute right-3 top-3 z-20 font-mono text-[9px] text-slate-400">
            DNS / AUTH
          </div>

          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
          />

          {/* DMARC core */}
          <div
            className="
              absolute
              left-1/2
              top-1/2
              z-20
              min-w-[106px]
              -translate-x-1/2
              -translate-y-1/2
              rounded-lg
              border
              border-slate-200
              bg-[#fbfbfa]
              px-3
              py-2
              text-center
              shadow-[0_4px_14px_rgba(15,23,42,0.06)]
            "
          >
            <div className="font-mono text-[8px] uppercase tracking-[0.11em] text-slate-400">
              DMARC Policy
            </div>

            <div className="mt-1 font-mono text-[11px] font-semibold text-indigo-700">
              p=reject 🛡️
            </div>
          </div>
        </div>
      </div>

      {/* DNS records */}
      <div className="relative z-10 px-5 pt-3">
        <div className="border-y border-slate-200">
          <DnsRow
            label="SPF Record"
            value="Enforced"
          />

          <DnsRow
            label="DKIM Key"
            value="2048-bit RSA"
          />

          <DnsRow
            label="TLS 1.3 Ciphers"
            value="A+ Grade"
            last
          />
        </div>
      </div>

      {/* Copy */}
      <div className="relative z-10 mt-auto px-5 pb-5 pt-5">
        <h3 className="font-serif text-xl font-bold tracking-tight text-slate-900">
          DNS & Anti-Spoofing
        </h3>

        <p className="mt-1.5 font-sans text-xs leading-relaxed text-slate-600">
          Audit DNS hygiene, stop email domain spoofing, and verify TLS
          certificate chain strength before expiry.
        </p>
      </div>
    </div>
  );
}

function DnsRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`
        flex
        min-h-9
        items-center
        justify-between
        gap-3
        ${last ? "" : "border-b border-slate-200"}
      `}
    >
      <span className="font-mono text-[10px] text-slate-500">
        {label}
      </span>

      <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-medium text-slate-700">
        <span className="flex size-4 items-center justify-center rounded-full bg-emerald-50">
          <Check
            className="size-2.5 text-emerald-600"
            strokeWidth={2.4}
          />
        </span>

        {value}
      </span>
    </div>
  );
}