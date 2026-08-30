"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Zap } from "lucide-react";

export default function CardFour() {
  const [isHover, setIsHover] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const monitorRef = useRef<HTMLDivElement>(null);

  const tlRef = useRef<gsap.core.Timeline | null>(null);

  /*
   * Performance trace
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let frame = 0;
    let step = 0;

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

      step += isHover ? 0.035 : 0.014;

      /*
       * Plot area
       */
      const left = 14;
      const right = width - 14;
      const top = 30;
      const bottom = height - 16;

      const plotWidth = right - left;
      const plotHeight = bottom - top;

      /*
       * Horizontal calibration lines
       */
      for (let i = 0; i <= 3; i++) {
        const y = top + (plotHeight / 3) * i;

        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);

        ctx.strokeStyle =
          i === 3
            ? "rgba(100, 116, 139, 0.18)"
            : "rgba(100, 116, 139, 0.10)";

        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /*
       * Vertical calibration markers
       */
      for (let i = 0; i <= 6; i++) {
        const x = left + (plotWidth / 6) * i;

        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);

        ctx.strokeStyle = "rgba(100, 116, 139, 0.07)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /*
       * Secondary latency trace
       */
      ctx.beginPath();

      for (let x = left; x <= right; x += 1) {
        const normalized = (x - left) / plotWidth;

        const envelope =
          Math.sin(normalized * Math.PI) * 5;

        const y =
          top +
          plotHeight * 0.62 +
          Math.sin(
            normalized * 9 +
              step * 0.7
          ) *
            envelope;

        if (x === left) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = "rgba(100, 116, 139, 0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();

      /*
       * Main rendering trace.
       *
       * The uneven waveform makes this look more like
       * recorded telemetry than a generic sine wave.
       */
      ctx.beginPath();

      for (let x = left; x <= right; x += 1) {
        const normalized = (x - left) / plotWidth;

        const envelope =
          Math.sin(normalized * Math.PI);

        const fundamental =
          Math.sin(
            normalized * 12 +
              step
          ) *
          7;

        const detail =
          Math.sin(
            normalized * 31 -
              step * 0.65
          ) *
          2.5;

        const transient =
          Math.exp(
            -Math.pow(
              (normalized - 0.69) * 13,
              2
            )
          ) *
          8 *
          Math.sin(step * 1.4);

        const amplitude = isHover ? 1.15 : 1;

        const y =
          top +
          plotHeight * 0.48 +
          (fundamental +
            detail +
            transient) *
            envelope *
            amplitude;

        if (x === left) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = isHover
        ? "#059669"
        : "#10b981";

      ctx.lineWidth = isHover ? 1.8 : 1.4;
      ctx.stroke();

      /*
       * Current sample marker
       */
      const cursorProgress =
        (step * 0.14) % 1;

      const cursorX =
        left + plotWidth * cursorProgress;

      ctx.beginPath();
      ctx.moveTo(cursorX, top);
      ctx.lineTo(cursorX, bottom);

      ctx.strokeStyle = "rgba(16, 185, 129, 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();

      /*
       * Small sample point
       */
      const cursorY =
        top +
        plotHeight * 0.48 +
        Math.sin(
          cursorProgress * 12 + step
        ) *
          7 *
          Math.sin(
            cursorProgress * Math.PI
          );

      ctx.beginPath();

      ctx.arc(
        cursorX,
        cursorY,
        2.3,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "#059669";
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

  /*
   * Hover only affects geometry/shadow.
   *
   * No GSAP text-color or background-color animation,
   * which avoids the black-text/reverse animation issue
   * from the earlier cards.
   */
  const { contextSafe } = useGSAP(
    () => {
      const timeline = gsap.timeline({
        paused: true,
      });

      timeline
        .to(cardRef.current, {
          y: -4,
          boxShadow:
            "0 18px 40px -24px rgba(15,23,42,0.22)",
          duration: 0.42,
          ease: "power3.out",
        })
        .to(
          monitorRef.current,
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
      relative col-span-6 md:col-span-2
      flex min-h-[400px] w-full flex-col
      overflow-hidden rounded-2xl
      border border-slate-200
      bg-[#fbfbfa]
      shadow-[0_1px_2px_rgba(15,23,42,0.03)]
    "
  >
    {/* Header */}
    <div className="flex items-start justify-between px-5 pt-5">
      <div>
        <div className="flex items-center gap-2">
          <Zap
            className="size-3.5 text-emerald-600"
            strokeWidth={1.8}
          />

          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            Lighthouse CWV
          </span>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <span className="font-serif text-[44px] font-semibold leading-none tracking-[-0.05em] text-slate-900">
            99
          </span>

          <div className="pb-1">
            <div className="font-mono text-[9px] text-slate-400">
              /100
            </div>

            <div className="font-mono text-[9px] font-medium text-emerald-700">
              Speed
            </div>
          </div>
        </div>
      </div>

      <div className="mt-0.5 size-2 rounded-full bg-emerald-500" />
    </div>

    {/* Graph */}
    <div className="px-5 pt-5">
      <div className="relative h-[85px] border-y border-slate-200">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
        />

        <span className="absolute bottom-2 right-0 font-mono text-[8px] text-slate-400">
          LIVE TRACE
        </span>
      </div>
    </div>

    {/* Metrics */}
    <div className="grid grid-cols-3 px-5 pt-4">
      <EditorialMetric
        label="LCP"
        value="0.78s"
        status="Fast"
      />

      <EditorialMetric
        label="INP"
        value="28ms"
        status="Optimal"
        middle
      />

      <EditorialMetric
        label="CLS"
        value="0.001"
        status="Zero Shift"
      />
    </div>

    {/* Copy */}
    <div className="mt-auto px-5 pb-5 pt-6">
      <h3 className="font-serif text-xl font-bold tracking-tight text-slate-900">
        Sub-Second Web Vitals
      </h3>

      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
        Diagnose real user rendering bottlenecks, payload bloat, and TTFB
        latency across mobile and desktop.
      </p>
    </div>
  </div>
);

function EditorialMetric({
  label,
  value,
  status,
  middle = false,
}: {
  label: string;
  value: string;
  status: string;
  middle?: boolean;
}) {
  return (
    <div
      className={`
        ${middle ? "border-x border-slate-200 px-3" : ""}
        ${!middle ? "px-1" : ""}
      `}
    >
      <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </div>

      <div className="mt-1 font-mono text-[12px] font-semibold tracking-[-0.02em] text-slate-800">
        {value}
      </div>

      <div className="mt-0.5 text-[9px] text-slate-500">
        {status}
      </div>
    </div>
  );
}
}

function MetricRow({
  metric,
  value,
  status,
  last = false,
}: {
  metric: string;
  value: string;
  status: string;
  last?: boolean;
}) {
  return (
    <div
      className={`
        grid
        min-h-9
        grid-cols-[42px_1fr_auto]
        items-center
        gap-3
        ${last ? "" : "border-b border-slate-200"}
      `}
    >
      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {metric}
      </span>

      <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-800">
        {value}
      </span>

      <span className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        {status}
      </span>
    </div>
  );
}