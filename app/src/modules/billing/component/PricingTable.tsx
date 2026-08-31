"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  SecurityCheckIcon,
  Shield01Icon,
  Globe02Icon,
  Database02Icon,
  PlayIcon,
  AnalysisTextLinkIcon,
  Mail01Icon,
  WorkIcon,
  AiVideoIcon,
} from "@hugeicons/core-free-icons";
import PlanCard, {
  BillingCycleType,
  FeatureItem,
  PlanConfig,
} from "./PlanCard";

export default function PricingTable() {
  const [timeLine, setTimeLine] = useState<BillingCycleType>("monthly");
  const trpc = useTRPC();

  const { data: plansData } = useQuery(
    trpc.billing.getPlans.queryOptions()
  );

  const planConfigs: Record<string, PlanConfig> = {
    free: {
      name: "Free",
      description: "For developers exploring surface discovery & basic  testing.",
      billing_cycles: {
        monthly: { price_id: "", amount: 0 },
        quarterly: { price_id: "", amount: 0 },
        annually: { price_id: "", amount: 0 },
      },
    },
    starter: {
      name: "Starter",
      description: "Skip the security jargon. Get instant vulnerability proof and copy-paste code patches.",
      billing_cycles: {
        monthly: { price_id: "price_starter_monthly", amount: 19 },
        quarterly: { price_id: "price_starter_quarterly", amount: 102 },
        annually: { price_id: "price_starter_annual", amount: 182 },
      },
    },
    pro: {
      name: "Pro",
      description: "For fast-moving teams needing continuous daily audits & webhook alerts.",
      billing_cycles: {
        monthly: { price_id: "price_pro_monthly", amount: 39 },
        quarterly: { price_id: "price_pro_quarterly", amount: 210 },
        annually: { price_id: "price_pro_annual", amount: 375 },
      },
    },
    max: {
      name: "Business",
      description: "For agencies & organizations requiring unlimited audits & priority SLA.",
      billing_cycles: {
        monthly: { price_id: "price_max_monthly", amount: 79 },
        quarterly: { price_id: "price_max_quarterly", amount: 426 },
        annually: { price_id: "price_max_annual", amount: 758 },
      },
    },
  };


  const planFeatures: Record<string, FeatureItem[]> = {
  free: [
    { label: "1 Monitored Domain", icon: Globe02Icon },
    { label: "5 Full Audits per Month", icon: SecurityCheckIcon },
    { label: "1 Active API Key", icon: Shield01Icon },
    { label: "MCP Server for Cursor & Claude", icon: Database02Icon },
    { label: "Public Attack Surface Probes", icon: PlayIcon },
    { label: "Security Headers & TLS 1.3 Audit", icon: Shield01Icon },
    { label: "Basic SEO & DNS Health Checks", icon: Globe02Icon },
    { label: "Preview Finding Explanations", icon: AnalysisTextLinkIcon },
  ],
  starter: [
    { label: "2 Monitored Domains", icon: Globe02Icon },
    { label: "50 Full Audits per Month", icon: SecurityCheckIcon },
    { label: "2 Active API Keys", icon: Shield01Icon },
    { label: "Full Evidence & Explanations", icon: AnalysisTextLinkIcon },
    { label: "Actionable Code & Config Diffs", icon: Database02Icon },
    { label: "CORS & Secret Leak Discovery", icon: Shield01Icon },
    { label: "SPF, DKIM & DMARC Anti-Spoofing", icon: Globe02Icon },
    { label: "Core Web Vitals & Latency Profiling", icon: PlayIcon },
    { label: "1-Click Finding Retest Verification", icon: SecurityCheckIcon },
    { label: "Executive PDF Report Exports", icon: Mail01Icon },
  ],
  pro: [
    { label: "5 Monitored Domains", icon: Globe02Icon },
    { label: "250 Full Audits per Month", icon: SecurityCheckIcon },
    { label: "5 Active API Keys", icon: Shield01Icon },
    { label: "Daily Automated Surface Monitoring", icon: PlayIcon },
    { label: "24/7 Heartbeat & Uptime Monitoring", icon: SecurityCheckIcon },
    { label: "Slack & Discord Incident Webhooks", icon: Mail01Icon },
    { label: "Regression & Scan Diff Engine", icon: Database02Icon },
    { label: "AEO & AI Search Crawler Readiness", icon: AiVideoIcon },
    { label: "Supabase & Postgres RLS Audits", icon: Database02Icon },
    { label: "Public Shareable Report Links", icon: AnalysisTextLinkIcon },
  ],
  max: [
    { label: "25 Monitored Domains", icon: Globe02Icon },
    { label: "Unlimited Monthly Scans", icon: SecurityCheckIcon },
    { label: "25 Active API Keys", icon: Shield01Icon },
    { label: "Custom Hourly & CI/CD Schedules", icon: PlayIcon },
    { label: "Multi-Seat Team Workspaces", icon: WorkIcon },
    { label: "White-Label Reports & Custom Logo", icon: Mail01Icon },
    { label: "Isolated Client Workspaces", icon: WorkIcon },
    { label: "Commercial & Agency Audit Rights", icon: SecurityCheckIcon },
    { label: "Priority Engineering SLA Support", icon: Shield01Icon },
  ],
};
  const renderedPlans = ["free", "starter", "pro", "max"];

  return (
    <div className="space-y-8">
      {/* Billing Cycle Toggle */}
      <div className="flex items-center  justify-center">
        <div className="inline-flex items-center zrelative rounded-xl border border-stone-200 bg-stone-100/80 p-1 shadow-2xs">
          {(["monthly", "quarterly", "annually"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setTimeLine(cycle)}
              className={`rounded-lg relative px-3.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                timeLine === cycle
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {cycle === "annually" ? "Annual" : cycle}
             { cycle!!="monthly" && <span className="bg-blue-500  absolute left-1/4   w-fit   bottom-0 whitespace-nowrap translate-y-1/2 px-2 py-0.5 font-bold text-white rounded-3xl text-center text-[10px]  uppercase">
                {cycle == "quarterly" ? " save 10%" : " save 20%"}
              </span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {renderedPlans.map((tierKey,i) => {
          const config = planConfigs[tierKey];
          const features = planFeatures[tierKey];
          const isPopular = tierKey === "pro";

          return (
           i!=0 && <PlanCard
              key={tierKey}
              plan={config}
              timeLine={timeLine}
              popular={isPopular}
              feature={features}
            />
          );
        })}
      </div>
    </div>
  );
}
