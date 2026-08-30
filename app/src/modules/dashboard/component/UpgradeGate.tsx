"use client";

import Link from "next/link";
import { LockKeyhole, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpgradeGateProps {
  title: string;
  description?: string;
  planRequired?: "starter" | "pro" | "max";
  features?: string[];
  variant?: "card" | "banner" | "overlay";
  className?: string;
}

export default function UpgradeGate({
  title,
  description,
  planRequired = "starter",
  features = [],
  variant = "card",
  className,
}: UpgradeGateProps) {
  const planName = planRequired === "max" ? "Max" : planRequired === "pro" ? "Pro" : "Starter";

  const defaultDesc =
    description ||
    `Upgrade to ${planName} or higher to unlock complete ${title.toLowerCase()}, automated monitoring, deep remediation steps, and full findings reports.`;

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/70 via-white to-amber-50/40 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100/80 text-rose-600">
            <LockKeyhole className="size-4" />
          </div>
          <div>
            <h4 className="font-heading text-sm font-semibold text-slate-900 flex items-center gap-2">
              Unlock {title}
              <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                {planName}+
              </span>
            </h4>
            <p className="mt-0.5 text-xs text-slate-600 max-w-xl">{defaultDesc}</p>
          </div>
        </div>
        <Link href="/dashboard/settings/billing" className="shrink-0">
          <Button size="sm" className="bg-[#f43f5e] hover:bg-[#e11d48] text-white text-xs h-8 px-3.5 gap-1.5 font-medium shadow-xs">
            <Sparkles className="size-3.5" /> Upgrade Plan
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xs max-w-2xl mx-auto my-6",
        className
      )}
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 mb-4">
        <LockKeyhole className="size-6" />
      </div>
      <span className="inline-flex rounded-full bg-rose-50 border border-rose-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 uppercase tracking-wider mb-2">
        {planName} Feature
      </span>
      <h2 className="font-heading text-xl font-bold text-slate-900">
        {title} is locked on Free Tier
      </h2>
      <p className="mt-2 font-content text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
        {defaultDesc}
      </p>

      {features.length > 0 && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left bg-slate-50 rounded-xl p-4 border border-slate-100 max-w-md mx-auto">
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard/settings/billing">
          <Button className="bg-[#f43f5e] hover:bg-[#e11d48] text-white text-xs px-5 h-9 font-medium gap-1.5 shadow-sm">
            <Sparkles className="size-3.5" />
            Upgrade to {planName}
          </Button>
        </Link>
        <Link href="/dashboard/settings/billing">
          <Button variant="outline" className="text-xs h-9 px-4 text-slate-600 border-slate-200">
            Compare all plans <ArrowRight className="size-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

