"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CheckCircle2, Sparkles } from "lucide-react";

export default function CardTwo() {
  const [isHover, setIsHover] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  /*
   * AEO crawler network
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let animationFrameId = 0;
    let time = 0;

    const crawlers = [
      {
        name: "ChatGPT",
        color: "#10b981",
        anchor: "top-left",
        phase: 0,
      },
      {
        name: "Perplexity",
        color: "#0ea5e9",
        anchor: "top-right",
        phase: 0.28,
      },
      {
        name: "Claude",
        color: "#d97706",
        anchor: "bottom-left",
        phase: 0.54,
      },
      {
        name: "Gemini",
        color: "#8b5cf6",
        anchor: "bottom-right",
        phase: 0.78,
      },
    ];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const getNodePosition = (anchor: string, width: number, height: number) => {
      const horizontalInset = Math.max(58, width * 0.18);
      const verticalInset = 39;

      switch (anchor) {
        case "top-left":
          return {
            x: horizontalInset,
            y: verticalInset,
          };

        case "top-right":
          return {
            x: width - horizontalInset,
            y: verticalInset,
          };

        case "bottom-left":
          return {
            x: horizontalInset,
            y: height - verticalInset,
          };

        default:
          return {
            x: width - horizontalInset,
            y: height - verticalInset,
          };
      }
    };

    const roundedRect = (
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
    ) => {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
    };

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ctx.clearRect(0, 0, width, height);

      time += isHover ? 0.022 : 0.009;

      const centerX = width / 2;
      const centerY = height / 2;

      /*
       * Four crawler connections
       */
      crawlers.forEach((crawler, index) => {
        const node = getNodePosition(crawler.anchor, width, height);

        const dx = centerX - node.x;
        const dy = centerY - node.y;

        /*
         * Keep the line away from the text badge
         * and stop it at the entity boundary.
         */
        const distance = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / distance;
        const uy = dy / distance;

        const startX = node.x + ux * 48;
        const startY = node.y + uy * 18;

        const endX = centerX - ux * 42;
        const endY = centerY - uy * 42;

        /*
         * Quiet base connector
         */
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);

        ctx.strokeStyle = isHover
          ? "rgba(100,116,139,0.34)"
          : "rgba(148,163,184,0.23)";

        ctx.lineWidth = 1;
        ctx.stroke();

        /*
         * Laser pulse travelling into Schema.org
         */
        const pulseProgress =
          (time * (0.48 + index * 0.035) + crawler.phase) % 1;

        const pulseX = startX + (endX - startX) * pulseProgress;

        const pulseY = startY + (endY - startY) * pulseProgress;

        /*
         * Short streak before the pulse point.
         */
        const trailSize = isHover ? 15 : 9;

        const trailX = pulseX - ux * trailSize;
        const trailY = pulseY - uy * trailSize;

        const laserGradient = ctx.createLinearGradient(
          trailX,
          trailY,
          pulseX,
          pulseY,
        );

        laserGradient.addColorStop(0, `${crawler.color}00`);

        laserGradient.addColorStop(0.5, `${crawler.color}50`);

        laserGradient.addColorStop(1, crawler.color);

        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(pulseX, pulseY);

        ctx.strokeStyle = laserGradient;
        ctx.lineWidth = isHover ? 2 : 1.4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pulseX, pulseY, isHover ? 2.6 : 2, 0, Math.PI * 2);

        ctx.fillStyle = crawler.color;

        if (isHover) {
          ctx.shadowColor = crawler.color;
          ctx.shadowBlur = 7;
        }

        ctx.fill();

        ctx.shadowBlur = 0;

        /*
         * Crawler badge
         */
        const badgeWidth = crawler.name === "Perplexity" ? 84 : 76;

        const badgeHeight = 27;

        roundedRect(
          node.x - badgeWidth / 2,
          node.y - badgeHeight / 2,
          badgeWidth,
          badgeHeight,
          7,
        );

        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.strokeStyle = isHover
          ? "rgba(148,163,184,0.72)"
          : "rgba(203,213,225,0.82)";

        ctx.lineWidth = 1;
        ctx.stroke();

        /*
         * Brand indicator
         */
        ctx.beginPath();

        ctx.arc(node.x - badgeWidth / 2 + 13, node.y, 3, 0, Math.PI * 2);

        ctx.fillStyle = crawler.color;
        ctx.fill();

        /*
         * Crawler name
         */
        ctx.fillStyle = "#334155";

        ctx.font =
          "600 9px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

        ctx.textBaseline = "middle";
        ctx.textAlign = "left";

        ctx.fillText(crawler.name, node.x - badgeWidth / 2 + 21, node.y + 0.5);
      });

      /*
       * Schema.org entity core
       */
      const pulse = Math.sin(time * 2.4) * (isHover ? 2.2 : 1.2);

      /*
       * Outer pulse
       */
      ctx.beginPath();

      ctx.arc(centerX, centerY, 43 + pulse, 0, Math.PI * 2);

      ctx.strokeStyle = isHover
        ? "rgba(14,165,233,0.16)"
        : "rgba(14,165,233,0.08)";

      ctx.lineWidth = 1;
      ctx.stroke();

      /*
       * Core
       */
      ctx.beginPath();

      ctx.arc(centerX, centerY, 35, 0, Math.PI * 2);

      ctx.fillStyle = "#ffffff";

      ctx.shadowColor = "rgba(15,23,42,0.10)";

      ctx.shadowBlur = isHover ? 18 : 10;
      ctx.shadowOffsetY = 4;

      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.strokeStyle = isHover ? "#7dd3fc" : "#cbd5e1";

      ctx.lineWidth = 1.25;
      ctx.stroke();

      /*
       * Small entity status mark
       */
      ctx.beginPath();

      ctx.arc(centerX, centerY - 15, 3, 0, Math.PI * 2);

      ctx.fillStyle = "#0ea5e9";
      ctx.fill();

      /*
       * Schema.org
       */
      ctx.fillStyle = "#0f172a";

      ctx.font =
        "700 9px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText("Schema.org", centerX, centerY);

      /*
       * Entity core
       */
      ctx.fillStyle = "#64748b";

      ctx.font =
        "500 7.5px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

      ctx.fillText("Entity core", centerX, centerY + 13);

      animationFrameId = requestAnimationFrame(render);
    };

    resize();
    render();

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, [isHover]);

  /*
   * Restrained card interaction
   */
  const { contextSafe } = useGSAP(
    () => {
      gsap.set(metricsRef.current, {
        y: 4,
      });

      const timeline = gsap.timeline({
        paused: true,
      });

      timeline
        .to(cardRef.current, {
          y: -4,
          borderColor: "#cbd5e1",
          boxShadow: "0 20px 45px -28px rgba(15,23,42,0.28)",
          duration: 0.45,
          ease: "power3.out",
        })
        .to(
          metricsRef.current,
          {
            y: 0,
            duration: 0.4,
            ease: "power3.out",
          },
          "<",
        );

      tlRef.current = timeline;
    },
    {
      scope: cardRef,
    },
  );

  const handleMouseEnter = contextSafe(() => {
    setIsHover(true);

    tlRef.current?.timeScale(1).play();
  });

  const handleMouseLeave = contextSafe(() => {
    setIsHover(false);

    tlRef.current?.timeScale(1.25).reverse();
  });
 
  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="
        relative
        col-span-6
        md:col-span-3
        flex
        min-h-[420px]
        w-full
        min-w-64
        cursor-pointer
        flex-col
         justify-between
        overflow-hidden
        rounded-[20px]
        border
        border-slate-200
        bg-[#fafaf8z]
        shadow-[0_1px_2px_rgba(15,23,42,0.03)]
        will-change-transform
      "
    >
      <div
        style={{
          backgroundImage: "radial-gradient(#D2D2D2 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* restrained technical grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 68%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, transparent 68%)",
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between gap-4 px-6 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-25" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
            </span>

            <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-700">
              AEO & AI Search Readiness
            </span>
          </div>
        </div>

        {/* Network visualization */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-5 pt-1">
          <canvas
            ref={canvasRef}
            className="mx-auto block h-[190px] w-full max-w-[370px]"
          />

          {/* Live chips */}
          <div
            ref={metricsRef}
            className="mx-auto mt-2 flex max-w-[370px] flex-wrap items-center justify-center gap-1.5"
          >
            <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
              <CheckCircle2
                className="size-3 text-emerald-600"
                strokeWidth={2}
              />
              GPTBot: Indexed
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
              <Sparkles className="size-3 text-sky-600" strokeWidth={2} />
              JSON-LD Validated
            </div>

            <div className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold tabular-nums text-slate-600 shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
              98/100 Citation Index
            </div>
          </div>
        </div>
      </div>
      {/* Copy */}
      <div className="relative z-10 px-6 pb-6 pt-4 md:px-7 md:pb-7">
        {/* <div className="mb-5 h-px bg-slate-200/80" /> */}

        <h3 className="font-serif text-2xl font-bold tracking-tight text-slate-900">
          Engineered for AI Search
        </h3>

        <p className="mt-2.5 font-sans text-base leading-relaxed text-slate-600">
          Structure your data so ChatGPT, Perplexity, and Claude cite your
          website directly with verified Schema.org entity graphs.
        </p>
      </div>
    </div>
  );
}
