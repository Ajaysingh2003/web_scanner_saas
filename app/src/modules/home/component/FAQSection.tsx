"use client";

import React, { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Plus, Minus, MessageCircle, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface FAQItem {
  id: string;
  index: string;
  question: string;
  answer: string;
  contextNote?: string;
}

const faqs: FAQItem[] = [
  {
    id: "item-1",
    index: "01",
    question: "What does Scanlyst actually check?",
    answer:
      "Scanlyst looks across your website’s public security and technical surface, including security headers, TLS, DNS configuration, exposed files, CORS policies, performance signals, technical SEO, structured data, and AI-search readiness. The exact checks shown in a report depend on what is publicly observable for that site.",
  },
  {
    id: "item-2",
    index: "02",
    question: "Will a scan change anything on my website?",
    answer:
      "The standard audit is designed to inspect your site without modifying its content or configuration. Scanlyst evaluates public-facing signals and responses, then reports what it finds so you can review any recommended changes before applying them.",
    contextNote: "Your report stays read-only until you decide what to change.",
  },
  {
    id: "item-3",
    index: "03",
    question: "Do I need to install anything?",
    answer:
      "Not for a standard public website audit. You can start with a URL. Features that require deeper access, private environments, or connected workflows may need additional setup.",
  },
  {
    id: "item-4",
    index: "04",
    question: "What happens when Scanlyst finds a vulnerability?",
    answer:
      "The finding includes what was detected, why it matters, and the evidence behind it. When remediation guidance is available, Scanlyst also shows the configuration or implementation change you should review to resolve the issue.",
  },
  {
    id: "item-5",
    index: "05",
    question: "Does Scanlyst automatically make changes to my site?",
    answer:
      "Scanlyst should not silently change production configuration. Recommended fixes are presented for review so you understand what will change before anything is applied through a supported workflow.",
    contextNote: "Every configuration patch requires explicit team review.",
  },
  {
    id: "item-6",
    index: "06",
    question: "Can I scan any website?",
    answer:
      "Public checks can evaluate information that a website exposes on the internet, but deeper or active security testing should only be performed on systems you own or are authorized to assess. Make this distinction clear in the UI.",
  },
  {
    id: "item-7",
    index: "07",
    question: "How is this different from a traditional vulnerability scanner?",
    answer:
      "Traditional scanners often stop at a list of findings. Scanlyst is designed to connect the finding to understandable evidence, practical remediation, and continued monitoring while also covering adjacent technical areas such as domain health, performance, SEO, and AI-search readiness.",
  },
  {
    id: "item-8",
    index: "08",
    question: "Can Scanlyst keep monitoring the site after the first audit?",
    answer:
      "Yes, when monitoring is enabled, Scanlyst can continue checking supported endpoints and technical signals so teams can catch regressions, outages, certificate changes, and newly surfaced issues instead of relying only on one-time audits.",
  },
];

export default function FAQSection() {
  const [openItem, setOpenItem] = useState<string>("item-1");
  const sectionRef = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const activeIndex = faqs.findIndex((f) => f.id === openItem);
  const activeIndexString = activeIndex >= 0 ? faqs[activeIndex].index : "01";

  // Section Entrance Animation
  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        gsap.set(".faq-anim", { opacity: 1, y: 0 });
        gsap.set(".faq-mask-child", { yPercent: 0 });
        gsap.set(".faq-divider", { scaleX: 1 });
        return;
      }

      gsap.set(".faq-eyebrow", { opacity: 0, y: 8 });
      gsap.set(".faq-mask-child", { yPercent: 110 });
      gsap.set(".faq-support", { opacity: 0, y: 12 });
      gsap.set(".faq-help", { opacity: 0, y: 10 });
      gsap.set(".faq-divider", { scaleX: 0, transformOrigin: "left center" });
      gsap.set(".faq-row", { opacity: 0, y: 14 });
      gsap.set(".faq-counter", { opacity: 0, y: 6 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 78%",
          toggleActions: "play none none none",
        },
        defaults: { ease: "power3.out" },
      });

      tl.to(".faq-eyebrow", { opacity: 1, y: 0, duration: 0.4 })
        .to(".faq-headline .faq-mask-child", { yPercent: 0, duration: 0.5, stagger: 0.08 }, "-=0.2")
        .to(".faq-support", { opacity: 1, y: 0, duration: 0.45 }, "-=0.25")
        .to(".faq-help", { opacity: 1, y: 0, duration: 0.4 }, "-=0.2")
        .to(".faq-divider", { scaleX: 1, duration: 0.55, ease: "power4.out" }, "-=0.35")
        .to(".faq-row", { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 }, "-=0.3")
        .to(".faq-counter", { opacity: 1, y: 0, duration: 0.35 }, "-=0.15");
    },
    { scope: sectionRef }
  );

  // Counter Flip Animation on FAQ change
  useEffect(() => {
    if (!counterRef.current) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.fromTo(
      counterRef.current,
      { y: -6, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.28, ease: "power3.out" }
    );
  }, [openItem]);

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="w-full py-20 md:py-28 bg-[#fafaf9] border-t border-b border-stone-200/80"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-start">
          {/* =========================================================================
              LEFT COLUMN: Editorial Heading & Support Link (38% on desktop)
              ========================================================================= */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <div className="space-y-3.5">
              <div className="faq-eyebrow inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wider text-stone-600 shadow-2xs">
                <span className="size-1.5 rounded-full bg-rose-500" />
                FAQ
              </div>

              <div className="faq-headline overflow-hidden">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-[1.18]">
                  <span className="faq-mask-child block">Questions before you</span>
                  <span className="faq-mask-child block text-slate-700 italic font-medium font-serif">
                    run your first scan?
                  </span>
                </h2>
              </div>

              <p className="faq-support font-content text-base text-slate-600 leading-relaxed pt-1">
                Everything you need to know about how Scanlyst scans, what it checks, and what happens when it finds something worth fixing.
              </p>
            </div>

            {/* Subtle Help Area */}
            <div className="faq-help pt-4 border-t border-stone-200/60 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-500">
                Still have a question?
              </span>
              <a
                href="mailto:support@scanlyst.dev"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 hover:text-rose-600 transition-colors group cursor-pointer"
              >
                <MessageCircle className="size-3.5 text-stone-400 group-hover:text-rose-500 transition-colors" />
                <span>Contact support</span>
                <ArrowRight className="size-3 text-stone-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
              </a>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: Custom Editorial FAQ Accordion (62% on desktop)
              ========================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top Animated Rule */}
            <div className="faq-divider h-px w-full bg-stone-200" />

            {/* shadcn Accordion Core */}
            <Accordion
              value={openItem ? [openItem] : []}
              onValueChange={(val) => {
                const nextVal = Array.isArray(val) ? val[0] || "" : typeof val === "string" ? val : "";
                setOpenItem(nextVal);
              }}
              className="divide-y divide-stone-200"
            >
              {faqs.map((faq) => {
                const isOpen = openItem === faq.id;

                return (
                  <FAQRow
                    key={faq.id}
                    faq={faq}
                    isOpen={isOpen}
                  />
                );
              })}
            </Accordion>

            {/* Bottom Utility Row with Masked Number Counter */}
            <div className="faq-counter pt-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>8 Core Questions Answered</span>
              </div>
              <div className="flex items-center gap-1">
                <span ref={counterRef} className="font-bold text-slate-700 inline-block">
                  {activeIndexString}
                </span>
                <span>/</span>
                <span>08</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   INDIVIDUAL FAQ ROW SUB-COMPONENT (Custom Hover + Radix Integration)
   ========================================================================= */
function FAQRow({
  faq,
  isOpen,
}: {
  faq: FAQItem;
  isOpen: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const textGroupRef = useRef<HTMLDivElement>(null);
  const answerInnerRef = useRef<HTMLDivElement>(null);

  // Microinteraction on hover
  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) return;

      if (isHovered && !isOpen) {
        gsap.to(textGroupRef.current, { x: 3, duration: 0.25, ease: "power2.out" });
        gsap.to(iconRef.current, { rotate: 45, duration: 0.25, ease: "power2.out" });
      } else {
        gsap.to(textGroupRef.current, { x: 0, duration: 0.2, ease: "power2.inOut" });
        gsap.to(iconRef.current, { rotate: 0, duration: 0.2, ease: "power2.inOut" });
      }
    },
    { scope: rowRef, dependencies: [isHovered, isOpen] }
  );

  // Internal answer content reveal motion when opened
  useGSAP(
    () => {
      if (!isOpen || !answerInnerRef.current) return;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        gsap.set(answerInnerRef.current, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        answerInnerRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.38, ease: "power3.out", delay: 0.05 }
      );
    },
    { scope: rowRef, dependencies: [isOpen] }
  );

  return (
    <div
      ref={rowRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="faq-row group relative"
    >
      <AccordionItem value={faq.id} className="border-none py-1">
        <AccordionTrigger
          hideChevron
          className="w-full py-4 sm:py-5 flex items-center justify-between text-left gap-4 hover:no-underline cursor-pointer group"
        >
          {/* Index + Question Title */}
          <div ref={textGroupRef} className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
            <span
              className={cn(
                "font-mono text-xs sm:text-[13px] font-semibold transition-colors duration-200 shrink-0",
                isOpen ? "text-rose-600 font-bold" : "text-stone-400 group-hover:text-slate-600"
              )}
            >
              {faq.index}
            </span>

            <h3
              className={cn(
                "font-heading text-base sm:text-[18px] tracking-tight transition-colors duration-200 leading-snug",
                isOpen ? "text-slate-950 font-bold" : "text-slate-800 font-medium group-hover:text-slate-950"
              )}
            >
              {faq.question}
            </h3>
          </div>

          {/* Custom Plus / Minus Control (32–36px touch target) */}
          <div
            ref={iconRef}
            className={cn(
              "flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
              isOpen
                ? "border-rose-200 bg-rose-50/60 text-rose-600 shadow-2xs"
                : "border-stone-200 bg-white text-stone-500 group-hover:border-stone-300 group-hover:text-slate-800 group-hover:bg-stone-50/80"
            )}
          >
            {isOpen ? (
              <Minus className="size-3.5 sm:size-4 stroke-[2.2]" />
            ) : (
              <Plus className="size-3.5 sm:size-4 stroke-[2.2]" />
            )}
          </div>
        </AccordionTrigger>

        {/* Answer Content Panel */}
        <AccordionContent className="pt-0 pb-5 text-left">
          <div
            ref={answerInnerRef}
            className="pl-7 sm:pl-9 pr-2 max-w-[660px] space-y-3 relative"
          >
            {/* Subtle Left Accent Line */}
            <div className="absolute left-1.5 sm:left-2 top-0 bottom-0 w-[1.5px] bg-rose-500/20 rounded-full" />

            <p className="font-content text-sm sm:text-[15px] text-slate-600 leading-[1.7]">
              {faq.answer}
            </p>

            {/* Optional Context Note */}
            {faq.contextNote && (
              <div className="pt-1 flex items-center gap-1.5 text-xs text-stone-500 font-mono">
                <span className="size-1 rounded-full bg-rose-500" />
                <span>{faq.contextNote}</span>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
