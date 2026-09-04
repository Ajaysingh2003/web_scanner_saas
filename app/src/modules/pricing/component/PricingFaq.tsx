"use client";

import React, { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingFaq {
  q: string;
  a: string;
  note?: string;
}

const FAQS: PricingFaq[] = [
  {
    q: "Do I need a credit card for the free scan?",
    a: "No. The first audit runs on a URL alone — no card, no signup wall before you see value. You only create an account when you want to save the report or enable monitoring.",
  },
  {
    q: "What counts as a “full audit”?",
    a: "One full audit is a complete pass over a domain: security headers, TLS, DNS, exposed files, CORS, performance signals, technical SEO, and structured data. Uptime heartbeats and cached report views never count against your quota.",
    note: "Quotas reset on the 1st of each month.",
  },
  {
    q: "What happens if I hit my monthly limit?",
    a: "Scans pause instead of billing you — there are no overage charges, ever. You can wait for the reset, delete an unused domain to free capacity, or upgrade mid-cycle and get the remaining days prorated.",
  },
  {
    q: "Can I change plans or cancel?",
    a: "Yes, both from the dashboard in two clicks. Upgrades apply immediately with prorated billing; downgrades and cancellations take effect at the end of the current period, and monitoring simply stops — your last reports stay readable.",
  },
  {
    q: "How do quarterly and annual billing work?",
    a: "Quarterly covers 3 months at 10% off the monthly rate, annual covers 12 months at 20% off. Both are charged upfront for the whole period. The strikethrough price on each card shows exactly what you'd pay month-to-month for the same period.",
  },
  {
    q: "Do agencies need the Business plan?",
    a: "If you audit sites you don't own, yes — commercial audit rights, isolated client workspaces, and white-label reports are Business-only. Starter and Pro licenses cover your own properties.",
  },
];

function FaqRow({
  faq,
  index,
  isOpen,
  onToggle,
}: {
  faq: PricingFaq;
  index: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const answerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!answerRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(answerRef.current, { opacity: 1, y: 0 });
        return;
      }
      if (isOpen) {
        gsap.fromTo(
          answerRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" },
        );
      }
    },
    { dependencies: [isOpen] },
  );

  return (
    <div className="faq-row border-b border-stone-200/80 last:border-0">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="group flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left sm:py-5"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-5">
          <span
            className={cn(
              "shrink-0 font-mono text-xs font-semibold transition-colors sm:text-[13px]",
              isOpen ? "text-rose-600" : "text-stone-400 group-hover:text-slate-600",
            )}
          >
            {index}
          </span>
          <span
            className={cn(
              "font-heading text-base leading-snug tracking-tight transition-colors sm:text-[17px]",
              isOpen
                ? "font-bold text-slate-950"
                : "font-medium text-slate-800 group-hover:text-slate-950",
            )}
          >
            {faq.q}
          </span>
        </span>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
            isOpen
              ? "border-rose-200 bg-rose-50/60 text-rose-600"
              : "border-stone-200 bg-white text-stone-500 group-hover:border-stone-300 group-hover:text-slate-800",
          )}
        >
          {isOpen ? (
            <Minus className="size-3.5 stroke-[2.2]" />
          ) : (
            <Plus className="size-3.5 stroke-[2.2]" />
          )}
        </span>
      </button>
      {isOpen && (
        <div ref={answerRef} className="relative pr-2 pb-5 pl-7 sm:pl-9">
          <div className="absolute top-0 bottom-5 left-1.5 w-[1.5px] rounded-full bg-rose-500/20 sm:left-2" />
          <p className="max-w-[640px] font-content text-sm leading-[1.7] text-slate-600 sm:text-[15px]">
            {faq.a}
          </p>
          {faq.note && (
            <p className="flex items-center gap-1.5 pt-2 font-mono text-xs text-stone-500">
              <span className="size-1 rounded-full bg-rose-500" />
              {faq.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PricingFaq() {
  const [open, setOpen] = useState<number>(0);

  return (
    <div className="divide-y divide-stone-200/80 border-y border-stone-200/80">
      {FAQS.map((faq, i) => (
        <FaqRow
          key={faq.q}
          faq={faq}
          index={String(i + 1).padStart(2, "0")}
          isOpen={open === i}
          onToggle={() => setOpen(open === i ? -1 : i)}
        />
      ))}
    </div>
  );
}
