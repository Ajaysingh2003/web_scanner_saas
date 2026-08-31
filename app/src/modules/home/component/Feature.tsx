"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import TopGridCard from "./TopGridCard";
import TopHeader from "./TopHeader";
import CardOne from "./CardOne";
import CardTwo from "./CardTwo";
import CardThree from "./CardThree";
import CardFour from "./CardFour";
import CardFive from "./CardFive";
import BentoCard from "./BentoCard";

// import TopGridCard, { SecurityScoreChart } from './TopGridCard';
// import SecurityChart from './TopGridCard';

function FeaturesSection() {
  const agentRef = useRef<HTMLSpanElement | null>(null);
  const fundamentRef = useRef<HTMLSpanElement | null>(null);
  const sentimentRef = useRef<HTMLSpanElement | null>(null);
  const lineOneRef = useRef<HTMLSpanElement | null>(null);
  const lineTwoRef = useRef<HTMLSpanElement | null>(null);
  const lineThreeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const highlights = [
      agentRef.current,
      fundamentRef.current,
      sentimentRef.current,
    ].filter(Boolean);

    const lines = [
      lineOneRef.current,
      lineTwoRef.current,
      lineThreeRef.current,
    ].filter(Boolean);

    if (highlights.length === 0 || lines.length === 0) return;

    // Initial state
    gsap.set(highlights, {
      backgroundColor: "#f4f4f5",
      color: "#a1a1aa",
      scale: 1,
    });
    gsap.set(lines, { color: "#a1a1aa" });

    // First item active
    gsap.set(highlights[0], {
      backgroundColor: "#ffe4e6",
      color: "#e11d48",
      scale: 1.03,
    });
    gsap.set(lines[0], { color: "#18181b" });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });

    highlights.forEach((_, i) => {
      const next = (i + 1) % highlights.length;
      const startTime = i * 2.5;

      tl.to(
        highlights[i],
        {
          backgroundColor: "#f4f4f5",
          color: "#a1a1aa",
          scale: 1,
          duration: 0.5,
          ease: "power2.inOut",
        },
        startTime,
      )
        .to(lines[i], { color: "#a1a1aa", duration: 0.5 }, "<")
        .to(
          highlights[next],
          {
            backgroundColor: "#ffe4e6",
            color: "#e11d48",
            scale: 1.03,
            duration: 0.5,
            ease: "back.out(1.7)",
          },
          startTime,
        )
        .to(lines[next], { color: "#18181b", duration: 0.5 }, "<");
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section className="w-full py-20 md:py-28 lg:py-36">
      <div className="max-w-6xla mx-auto px-4 sm:px-6 lg:px-8">
        {/* Animated Headline */}
        <div className="max-w-3xl mb-6 md:mb-16">
          <h2 className="text-[22px] sm:text-3xl leading-relaxedz md:text-[34px] lg:text-[40px] font-semibold text-zinc-400 leading-[1.35] tracking-tight">
            <span ref={lineOneRef} className="block">
              Analyze every{" "}
              <span
                ref={agentRef}
                className="inline-block px-3 py-0 mx-1 rounded-xl bg-zinc-100 text-zinc-400 font-medium"
              >
                security layer
              </span>{" "}
              of <span className="hidden md:inline-block">your</span>
            </span>

            <span ref={lineTwoRef} className="block">
              <span
                ref={fundamentRef}
                className="inline-block px-3 mt-2 py-1 mx-1 rounded-xl bg-zinc-100 text-zinc-400 font-medium"
              >
                website
              </span>{" "}
              with AI-powered
            </span>
            <span ref={lineThreeRef} className="block">
              security
              <span
                ref={sentimentRef}
                className="inline-block px-3 py-1 mt-2 mx-1 rounded-xl bg-zinc-100 text-zinc-400 font-medium"
              >
                insights
              </span>
              .
            </span>
          </h2>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-6 gap-6 max-w-[1100px] mx-auto lg:py-6">
          <TopGridCard />
          <CardOne />
          <CardTwo />
          <CardThree />
          <CardFour />
          <CardFive />
        </div>

      </div>
    </section>
  );
}

export default FeaturesSection;
