
"use client";

import React, { useRef, useState } from "react";
import SearchBugs from "./SearchBugs";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { TextPlugin } from "gsap/TextPlugin";
import { TrendingUp, Zap } from "lucide-react";

gsap.registerPlugin(TextPlugin);

function CardOne() {
  const [isHover, setIsHover] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLParagraphElement>(null);
  const extraContentRef = useRef<HTMLDivElement>(null);
  const searchCard = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const { contextSafe } = useGSAP(() => {
    // Initial hidden states
    gsap.set(glowRef.current, { opacity: 0, scale: 0.6 });
    gsap.set(extraContentRef.current, { height: 0, overflow: "hidden" });
    gsap.set(ctaRef.current, { opacity: 0, x: -8 });
    gsap.set(".extra-p-tag", { opacity: 0, y: 12 });
    gsap.set(".extra-summary-row", { opacity: 0, y: 12 });

    const tl = gsap.timeline({ paused: true });

    // Morph card appearance
    tl.to(searchCard.current, {
      borderRadius: "12px",
      boxShadow: "0 12px 40px -8px rgba(0,0,0,0.12)",
      duration: 0.4,
      ease: "power2.out",
    })
      .to(
        cardRef.current,
        {
          scale: 1.02,
          y: -6,
          duration: 0.5,
          ease: "elastic.out(1, 0.3)",
        },
        "-=0.2"
      )
      .to(glowRef.current, { opacity: 0.15, scale: 1, duration: 0.5, ease: "power2.out" }, "<")
      .to(
        searchRef.current,
        { duration: 0.8, text: { value: "www.scanlyst.dev" }, ease: "none" },
        "<"
      )
      // Expand extra content
      .to(extraContentRef.current, {
        height: "auto",
        // marginTop: 16,
        duration: 0.4,
        ease: "back.out(1.2)",
      });

    // Animate each status line with a staggered shimmer
    const statusLines = cardRef.current?.querySelectorAll(".extra-p-tag");
    if (statusLines) {
      statusLines.forEach((line, index) => {
        tl.to(line, {
          opacity: 1,
          y: 0,
          duration: 1.3,
          ease: "power2.out",
        }, index === 0 ? "-=0.1" : "-=0.05");

        tl.to(line, {
          color: "#ffffff",
          // background: "linear-gradient(90deg, #FF6F00 0%, #000000 50%, #B4B8B5 100%)",
          background: "linear-gradient(90deg, #FFF1E6 0%, #fef3e2 50%, #B8B6B4 100%)",
          duration: 0.3,
          ease: "none",

        });

        tl.to(line, {
          color: "#4a4a4a",
          background: "none",
          duration: 0.25,
          ease: "none",
        });
      });
    }

    // Summary row
   // Step 1: Fade and slide in the summary row
tl.to(".extra-summary-row", {
  opacity: 1,
  y: 0,
  duration: 0.3,
  ease: "power2.out",
}, "-=0.1")

// Step 2: Bright white flash sweep with glowing aura
.fromTo(".extra-summary-row", 
  {
    backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 50%, transparent 100%)",
    backgroundSize: "200% 100%",
    backgroundPosition: "100% 0",
    boxShadow: "0 0 0px rgba(255, 255, 255, 0)",
  },
  {
    backgroundPosition: "-100% 0",
    boxShadow: "0 0 16px rgba(255, 255, 255, 0.8), 0 0 6px rgba(226, 232, 240, 0.5)",
    duration: 0.7,
    ease: "power1.inOut",
  }
)

// Step 3: Fade out the flash and return back to neutral
.to(".extra-summary-row", {
  boxShadow: "0 0 0px rgba(255, 255, 255, 0)",
  duration: 0.25,
  ease: "power2.out",
})

// Step 4: Continue to CTA
.to(ctaRef.current, { 
  opacity: 1, 
  x: 0, 
  duration: 0.35, 
  ease: "back.out(1.5)" 
}, "-=0.1");



    tlRef.current = tl;
  }, { scope: cardRef });

  const handleMouseEnter = contextSafe(() => {
    setIsHover(true);
    tlRef.current?.timeScale(1).play();
  });

  const handleMouseLeave = contextSafe(() => {
    setIsHover(false);
    tlRef.current?.timeScale(1.6).reverse();
  });

  const handleMouseMove = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !glowRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    gsap.to(glowRef.current, {
      x: x - 150,
      y: y - 150,
      duration: 0.5,
      ease: "power2.out",
    });
  });

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className={`relative
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
        will-change-transform ${isHover}`}
    >
      {/* Glow */}
      <div style={{ backgroundImage: "radial-gradient(#D2D2D2 1px, transparent 1px)", backgroundSize: "20px 20px" }}>

      
      {/* <div
        ref={glowRef}
        className="pointer-events-none absolute left-0 top-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-amber-100 to-rose-100 blur-[100px]"
      /> */}

      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <span className="inline-flex items-center gap-2 rounded-full  bg-white/80 px-3 py-1 text-xs  text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-700">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          Live Scan
        </span>
        {/* <TrendingUp className="h-5 w-5 text-[#b5835a]" strokeWidth={1.5} /> */}
      </div>

      <div className="relative z-10 flex h-72 w-full items-center justify-center px-4">
        <SearchBugs
          searchCard={searchCard}
          searchRef={searchRef}
          extraContentRef={extraContentRef}
          hover={isHover}
        />
      </div>
</div>
      <div className="relative z-10 flex flex-col gap-2 p-5 pt-0 md:p-7 md:pt-0">
        <h3 className="font-serif text-2xl font-bold tracking-tight text-[#3d2c1f]">
          Scan For Issues
        </h3>
        <p className="font-sans text-base leading-relaxed text-[#5e4b3a]">
          Drop any URL – production, staging, or a quick prototype. We run every check in parallel and rank results with a fix.
        </p>
      </div>

    </div>
  );
}

export default CardOne;





