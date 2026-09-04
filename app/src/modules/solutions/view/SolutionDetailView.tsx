"use client";

import React, { useRef } from "react";
import { SolutionItem } from "../types";
import SolutionHero from "../component/SolutionHero";
import SolutionChecksGrid from "../component/SolutionChecksGrid";
import SolutionVisualSection from "../component/SolutionVisualSection";
import SolutionTrustSection from "../component/SolutionTrustSection";
import SolutionCtaSection from "../component/SolutionCtaSection";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin safely
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface SolutionDetailViewProps {
  solution: SolutionItem;
}

export default function SolutionDetailView({ solution }: SolutionDetailViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /* GSAP scroll-triggered subtle reveals */
  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion || !containerRef.current) return;

      // 1. Hero Reveal
      gsap.fromTo(
        ".solution-hero",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );

      // 2. Checks Section Reveal on Scroll
      ScrollTrigger.create({
        trigger: ".solution-checks-section",
        start: "top 80%",
        onEnter: () => {
          gsap.fromTo(
            ".solution-check-card",
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              duration: 0.45,
              stagger: 0.08,
              ease: "power2.out",
            }
          );
        },
        once: true,
      });

      // 3. Visual Section Reveal on Scroll
      ScrollTrigger.create({
        trigger: ".solution-visual-section",
        start: "top 80%",
        onEnter: () => {
          gsap.fromTo(
            ".solution-visual-section",
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
          );
        },
        once: true,
      });

      // 4. Standards Section Reveal on Scroll
      ScrollTrigger.create({
        trigger: ".solution-trust-section",
        start: "top 80%",
        onEnter: () => {
          gsap.fromTo(
            ".solution-trust-card",
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.45,
              stagger: 0.08,
              ease: "power2.out",
            }
          );
        },
        once: true,
      });

      // 5. Closing CTA Reveal
      ScrollTrigger.create({
        trigger: ".solution-cta-section",
        start: "top 85%",
        onEnter: () => {
          gsap.fromTo(
            ".solution-cta-section",
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
          );
        },
        once: true,
      });
    },
    { scope: containerRef, dependencies: [solution.id] }
  );

  return (
    <div ref={containerRef} className="w-full bg-[#ffffff] text-slate-900 min-h-screen">
      <div className="pt-24 pb-20 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Hero Section */}
        <SolutionHero solution={solution} />

        {/* Feature Breakdown / What We Check */}
        <SolutionChecksGrid solution={solution} />

        {/* Visual / Telemetry Architecture Section */}
        <SolutionVisualSection solution={solution} />

        {/* Standards & Compliance Alignment */}
        <SolutionTrustSection solution={solution} />

        {/* Closing Conversion CTA */}
        <SolutionCtaSection
          title={solution.ctaTitle}
          description={solution.ctaDescription}
        />
      </div>

      {/* Global Footer */}
    </div>
  );
}
