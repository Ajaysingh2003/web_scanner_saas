"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Globe,
  Shield,
  ShieldAlert,
  FileCode,
  Activity,
  ChevronRight,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Terminal,
  ExternalLink,
  Sparkles,
  Search,
  Lock,
  Server,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { InteractiveStepTwo } from "@/modules/home/component/InteractiveStepTwo";
import { InteractiveStepOne } from "@/modules/home/component/InteractiveStepOne";
import { InteractiveStepThree } from "@/modules/home/component/InteractiveStepThree";
import { InteractiveStepFive } from "@/modules/home/component/InteractiveStepFive";
import InteractiveStepFour from "@/modules/home/component/InteractiveStepFour";

interface StepItem {
  id: number;
  number: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const stepsData: StepItem[] = [
  {
    id: 1,
    number: "01",
    title: "Add your website",
    description:
      "Enter your public URL and Scanlyst maps the security, performance, domain, SEO, and AI-search surfaces that matter.",
    icon: Globe,
  },
  {
    id: 2,
    number: "02",
    title: "Scan the attack surface",
    description:
      "Run a structured audit across headers, TLS, DNS, exposed configuration, application behavior, and known security risks.",
    icon: Shield,
  },
  {
    id: 3,
    number: "03",
    title: "Understand what needs attention",
    description:
      "Findings are ranked by severity with evidence and context, helping teams quickly understand which problems matter.",
    icon: ShieldAlert,
  },
  {
    id: 4,
    number: "04",
    title: "Apply the right fix",
    description:
      "Review exact remediation guidance for each issue, including configuration changes and technical recommendations.",
    icon: FileCode,
  },
  {
    id: 5,
    number: "05",
    title: "Keep watching after the fix",
    description:
      "Continuous monitoring checks for regressions, outages, certificate changes, and new threats after the initial audit.",
    icon: Activity,
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const descRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressRefs = useRef<(HTMLDivElement | null)[]>([]);
  const graphicStageRef = useRef<HTMLDivElement>(null);
  const progressTimelineRef = useRef<gsap.core.Timeline | null>(null);

  // Setup initial heights for accordion items in DOM
  const { contextSafe } = useGSAP(
    () => {
      descRefs.current.forEach((el, index) => {
        if (!el) return;
        const step = stepsData[index];
        if (step.id === activeStep) {
          gsap.set(el, { height: "auto", opacity: 1 });
          gsap.set(el.querySelector(".desc-inner"), { y: 0, opacity: 1 });
        } else {
          gsap.set(el, { height: 0, opacity: 0 });
          gsap.set(el.querySelector(".desc-inner"), { y: 8, opacity: 0 });
        }
      });
    },
    { scope: containerRef },
  );

  // Step Activation Handler with 8s Progress Timer
  const handleSelectStep = contextSafe((stepId: number) => {
    if (stepId === activeStep && progressTimelineRef.current?.isActive())
      return;

    setActiveStep(stepId);

    // Animate accordion items in DOM (bidirectional height 0 <-> auto)
    descRefs.current.forEach((el, index) => {
      if (!el) return;
      const step = stepsData[index];
      if (step.id === stepId) {
        gsap.fromTo(
          el,
          { height: 0, opacity: 0 },
          { height: "auto", opacity: 1, duration: 0.45, ease: "power3.out" },
        );
        gsap.fromTo(
          el.querySelector(".desc-inner"),
          { y: 8, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power3.out", delay: 0.05 },
        );
      } else {
        gsap.to(el, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: "power2.inOut",
        });
        gsap.to(el.querySelector(".desc-inner"), {
          y: 6,
          opacity: 0,
          duration: 0.25,
        });
      }
    });

    // Reset and rebuild the 8-second progress rail
    if (progressTimelineRef.current) {
      progressTimelineRef.current.kill();
    }

    progressRefs.current.forEach((bar) => {
      if (bar) gsap.set(bar, { scaleX: 0 });
    });

    const activeBar = progressRefs.current[stepId - 1];
    if (activeBar) {
      const ptl = gsap.timeline({
        onComplete: () => {
          const nextStep = (stepId % stepsData.length) + 1;
          handleSelectStep(nextStep);
        },
      });

      ptl.fromTo(
        activeBar,
        { scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 8, ease: "none" },
      );

      progressTimelineRef.current = ptl;
    }

    // Animate right-side graphic container stage
    if (graphicStageRef.current) {
      gsap.fromTo(
        graphicStageRef.current,
        {
          opacity: 0.3,
          y: 8,
          scale: 0.98,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.45,
          ease: "power3.out",
        },
      );
    }
  });

  // Pause auto-cycle when hovering over either accordion or graphic
  const handleMouseEnter = () => {
    progressTimelineRef.current?.pause();
  };

  const handleMouseLeave = () => {
    progressTimelineRef.current?.resume();
  };

  // Mount initial auto-cycle
  useEffect(() => {
    handleSelectStep(1);
    return () => {
      if (progressTimelineRef.current) progressTimelineRef.current.kill();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="w-full py-20 md:py-10 bg-[#fafaf9] border-t border-b border-stone-200/80"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 md:mb-16 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wider text-stone-600 shadow-2xs mb-3">
            <span className="size-1.5 rounded-full bg-rose-500" />
            Audit Lifecycle
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
            How Scanlyst Works
          </h2>
          <p className="font-content text-base text-slate-600 mt-2 leading-relaxed">
            From initial surface mapping to automated remediation and continuous
            heartbeat monitoring.
          </p>
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* LEFT: Accordion Steps (6 cols) */}
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="lg:col-span-6 rounded-2xl border border-stone-200/90 bg-white overflow-hidden shadow-2xs divide-y divide-stone-100 flex flex-col justify-between"
          >
            {stepsData.map((step, index) => {
              const isActive = activeStep === step.id;

              return (
                <div
                  key={step.id}
                  onClick={() => handleSelectStep(step.id)}
                  className={`group relative p-4 sm:p-5 transition-colors duration-200 cursor-pointer ${
                    isActive ? "bg-[#fffdfa]" : "bg-white hover:bg-stone-50/70"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Step Number & Icon */}
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-all ${
                        isActive
                          ? "border-rose-200 bg-rose-50 text-rose-600 shadow-2xs"
                          : "border-stone-200 bg-stone-50 text-stone-400 group-hover:text-slate-600 group-hover:border-stone-300"
                      }`}
                    >
                      <span>{step.number}</span>
                    </div>

                    {/* Text Container */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3
                          className={`font-heading text-base font-semibold transition-colors ${
                            isActive
                              ? "text-slate-950 font-bold"
                              : "text-slate-700 group-hover:text-slate-900"
                          }`}
                        >
                          {step.title}
                        </h3>
                        <ChevronRight
                          className={`size-4 text-stone-400 transition-transform duration-200 ${
                            isActive
                              ? "rotate-90 text-rose-500"
                              : "group-hover:translate-x-0.5"
                          }`}
                        />
                      </div>

                      {/* Description stays in DOM for GSAP */}
                      <div
                        ref={(el) => {
                          descRefs.current[index] = el;
                        }}
                        className="overflow-hidden"
                      >
                        <div className="desc-inner pt-2">
                          <p className="font-content text-sm text-slate-600 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1.5px Rose Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-transparent overflow-hidden">
                    <div
                      ref={(el) => {
                        progressRefs.current[index] = el;
                      }}
                      className="h-full w-full bg-rose-500 scale-x-0"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: Unified Interactive Stage */}
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="lg:col-span-6 relative flex flex-col min-h-[440px] sm:min-h-[460px] rounded-2xl bg-white border border-stone-200/90 p-6 sm:p-7 overflow-hidden shadow-2xs justify-between"
          >
            {/* Engineering Grid Guide Lines */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="absolute h-full w-px bg-stone-200/30" />
              <div className="absolute w-full h-px bg-stone-200/30" />
              <div className="size-72 rounded-full border border-stone-200/20" />
            </div>

            {/* Render Active Interactive Visual */}
            <div
              ref={graphicStageRef}
              className="relative z-10 w-full h-full flex flex-col justify-between flex-1"
            >
              {activeStep === 1 && <InteractiveStepOne />}
              {activeStep === 2 && <InteractiveStepTwo />}
              {activeStep === 3 && <InteractiveStepThree />}
              {activeStep === 4 && <InteractiveStepFour />}
              {activeStep === 5 && <InteractiveStepFive />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}