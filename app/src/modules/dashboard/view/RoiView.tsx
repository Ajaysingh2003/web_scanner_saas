"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Save,
  Users,
  MousePointerClick,
  Timer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Gauge,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Timeframe = "monthly" | "annual";

export default function RoiView() {
  const { project, projectId, isLoading: projectLoading } = useActiveProject();
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const [currency, setCurrency] = useState("USD");

  // User business inputs
  const [monthlySessions, setMonthlySessions] = useState<number>(25000);
  const [averageOrderValue, setAverageOrderValue] = useState<number>(80);
  const [conversionRate, setConversionRate] = useState<number>(2.5);
  const [lcpDelay, setLcpDelay] = useState<number>(1.8);
  const [securityRiskLevel, setSecurityRiskLevel] = useState<"low" | "medium" | "high">("medium");

  const { data: overview, isLoading: overviewLoading } = useQuery(
    trpc.project.overview.queryOptions(
      { project_id: projectId || "00000000-0000-0000-0000-000000000000" },
      { enabled: !!projectId },
    ),
  );

  const { data: latestScan } = useQuery(
    trpc.project.latestScan.queryOptions(
      { project_id: projectId || "00000000-0000-0000-0000-000000000000" },
      { enabled: !!projectId },
    ),
  );

  const { data: roiProfile, isLoading: roiLoading } = useQuery(
    trpc.project.roi.queryOptions(
      { project_id: projectId || "00000000-0000-0000-0000-000000000000" },
      { enabled: !!projectId },
    ),
  );

  // Sync initial values from profile or scan metrics
  useEffect(() => {
    if (roiProfile) {
      if (roiProfile.monthly_sessions) setMonthlySessions(roiProfile.monthly_sessions);
      if (roiProfile.average_order_value) setAverageOrderValue(roiProfile.average_order_value);
      if (roiProfile.conversion_rate) setConversionRate(roiProfile.conversion_rate);
      if (roiProfile.lcp_delay_seconds) setLcpDelay(roiProfile.lcp_delay_seconds);
      if (roiProfile.currency) setCurrency(roiProfile.currency);
    }
  }, [roiProfile]);

  // Infer security risks from latest scan if available
  useEffect(() => {
    if (latestScan?.findings) {
      const critHigh = latestScan.findings.filter(
        (f: any) => f.category === "security" && ["critical", "high"].includes(f.severity),
      ).length;
      if (critHigh >= 3) setSecurityRiskLevel("high");
      else if (critHigh >= 1) setSecurityRiskLevel("medium");
      else setSecurityRiskLevel("low");
    }
  }, [latestScan]);

  const updateMutation = useMutation({
    mutationFn: () =>
      client.project.updateRoi.mutate({
        project_id: projectId!,
        monthly_sessions: Math.max(1, Math.round(monthlySessions)),
        average_order_value: Math.max(0.01, averageOrderValue),
        conversion_rate: Math.max(0.01, Math.min(100, conversionRate)),
        currency,
        lcp_delay_seconds: Math.max(0, Math.min(30, lcpDelay)),
      }),
    onSuccess: () => {
      toast.success("ROI model parameters saved");
      queryClient.invalidateQueries({
        queryKey: trpc.project.roi.queryKey({ project_id: projectId || "" }),
      });
    },
    onError: (error) => toast.error(error.message || "Failed to save ROI settings"),
  });

  // Financial calculations
  const calculations = useMemo(() => {
    const sessions = Math.max(1, monthlySessions);
    const aov = Math.max(0, averageOrderValue);
    const cr = Math.max(0.01, conversionRate) / 100;

    // Monthly baseline revenue assuming healthy performance
    const baseMonthlyConversions = sessions * cr;
    const baseMonthlyRevenue = baseMonthlyConversions * aov;

    // 1. Latency Drop-off (Akamai/Google benchmark: ~7.2% drop per 1.0s delay beyond 0.8s)
    const effectiveDelay = Math.max(0, lcpDelay - 0.8);
    const speedLossPercent = Math.min(35, Number((effectiveDelay * 7.2).toFixed(1)));
    const speedMonthlyRevenueRisk = baseMonthlyRevenue * (speedLossPercent / 100);
    const speedConversionsLost = baseMonthlyConversions * (speedLossPercent / 100);

    // 2. Trust & Security Cart Abandonment Factor
    const secLossPercent =
      securityRiskLevel === "high" ? 4.5 : securityRiskLevel === "medium" ? 2.0 : 0.5;
    const secMonthlyRevenueRisk = baseMonthlyRevenue * (secLossPercent / 100);

    // 3. SEO / Discovery Organic Loss Factor
    const seoScore = overview?.category_scores?.seo ?? 85;
    const seoLossPercent = seoScore < 70 ? 5.0 : seoScore < 85 ? 2.5 : 0.8;
    const seoMonthlyRevenueRisk = baseMonthlyRevenue * (seoLossPercent / 100);

    // Total Combined Revenue at Risk
    const totalMonthlyRisk = speedMonthlyRevenueRisk + secMonthlyRevenueRisk + seoMonthlyRevenueRisk;
    const totalAnnualRisk = totalMonthlyRisk * 12;
    const totalLostConversions = Math.round(
      speedConversionsLost + baseMonthlyConversions * ((secLossPercent + seoLossPercent) / 100),
    );

    // Potential ROI from remediation (recover ~82% of at-risk revenue)
    const potentialMonthlyRecovery = totalMonthlyRisk * 0.82;
    const multiplier = timeframe === "annual" ? 12 : 1;

    return {
      baseMonthlyRevenue,
      baseAnnualRevenue: baseMonthlyRevenue * 12,
      totalRisk: totalMonthlyRisk * multiplier,
      speedLossPercent,
      speedRisk: speedMonthlyRevenueRisk * multiplier,
      secLossPercent,
      secRisk: secMonthlyRevenueRisk * multiplier,
      seoLossPercent,
      seoRisk: seoMonthlyRevenueRisk * multiplier,
      totalLostConversions: totalLostConversions * multiplier,
      potentialRecovery: potentialMonthlyRecovery * multiplier,
    };
  }, [monthlySessions, averageOrderValue, conversionRate, lcpDelay, securityRiskLevel, overview, timeframe]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleResetDefaults = () => {
    setMonthlySessions(25000);
    setAverageOrderValue(80);
    setConversionRate(2.5);
    setLcpDelay(1.8);
    toast.success("Reset to standard benchmark parameters");
  };

  if (projectLoading || overviewLoading || roiLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <EmptyState
          title="No Project Selected"
          description="Please select or create a project to model revenue risk and remediation ROI."
        />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Compact Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-lg font-bold text-slate-950">
              ROI & Revenue Risk Model
            </h1>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 font-semibold uppercase">
              Financial Impact
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 truncate max-w-xl">
            <span className="text-slate-700 font-semibold">{project.name}</span>
            <span>•</span>
            <span className="truncate">{project.website_url}</span>
            <span>•</span>
            <span className="text-slate-400">
              {timeframe === "monthly" ? "Monthly Forecast" : "Annual Run-Rate"}
            </span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTimeframe("monthly")}
              className={cn(
                "rounded-md px-3 py-1 font-semibold transition-all",
                timeframe === "monthly"
                  ? "bg-white text-slate-950 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("annual")}
              className={cn(
                "rounded-md px-3 py-1 font-semibold transition-all",
                timeframe === "annual"
                  ? "bg-white text-slate-950 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Annual
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="h-8 text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            <RotateCcw className="size-3 mr-1 text-slate-400" />
            Reset
          </Button>
        </div>
      </div>

      {/* 2. Top Level 3 Neutral Stat Cards (Clean Stripe / Linear Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Revenue at Risk */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {timeframe === "monthly" ? "Monthly" : "Annual"} Revenue at Risk
            </span>
            <TrendingDown className="size-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-3xl sm:text-4xl font-bold text-slate-950">
              {formatCurrency(calculations.totalRisk)}
            </span>
            <p className="mt-1 text-[11px] text-slate-500 font-content">
              Uncaptured revenue from speed latency and site issues
            </p>
          </div>
        </div>

        {/* Card 2: Recoverable Opportunity */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Recoverable Opportunity
            </span>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-3xl sm:text-4xl font-bold text-emerald-600">
              +{formatCurrency(calculations.potentialRecovery)}
            </span>
            <p className="mt-1 text-[11px] text-slate-500 font-content">
              Projected revenue regained after fixing audit findings (~82%)
            </p>
          </div>
        </div>

        {/* Card 3: Lost Conversions */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Lost Conversions
            </span>
            <MousePointerClick className="size-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-3xl sm:text-4xl font-bold text-slate-950">
              ~{calculations.totalLostConversions.toLocaleString()}
            </span>
            <p className="mt-1 text-[11px] text-slate-500 font-content">
              Visitors dropping off before completing checkout / sign-up
            </p>
          </div>
        </div>
      </div>

      {/* 3. Business Inputs & Financial Model Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Input Parameters (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                Traffic & Business Model Inputs
              </h2>
              <p className="text-[11px] text-slate-500 font-content mt-0.5">
                Calibrate to your actual analytics data for tailored dollar estimates.
              </p>
            </div>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white h-7 px-3 text-xs gap-1 shadow-2xs"
            >
              <Save className="size-3" />
              {updateMutation.isPending ? "Saving…" : "Save Model"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Monthly Sessions */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Users className="size-3.5 text-slate-400" />
                Monthly Visitors / Sessions
              </label>
              <Input
                type="number"
                min={1}
                step={500}
                value={monthlySessions}
                onChange={(e) => setMonthlySessions(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Average Order Value */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-slate-400" />
                Average Order Value ($)
              </label>
              <Input
                type="number"
                min={1}
                step={5}
                value={averageOrderValue}
                onChange={(e) => setAverageOrderValue(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Baseline Conversion Rate */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <MousePointerClick className="size-3.5 text-slate-400" />
                  Conversion Rate (%)
                </span>
                <span className="font-mono text-slate-900">{conversionRate}%</span>
              </div>
              <Input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={conversionRate}
                onChange={(e) => setConversionRate(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Core Web Vitals LCP Delay */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Timer className="size-3.5 text-slate-400" />
                  Page Load Delay (LCP)
                </span>
                <span className="font-mono text-slate-900">{lcpDelay.toFixed(1)}s</span>
              </div>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={lcpDelay}
                onChange={(e) => setLcpDelay(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* 5. Genuinely Interactive Latency Simulator Slider */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-700 font-semibold">
                Interactive Latency Simulator:
              </span>
              <span className="font-mono font-bold text-slate-900">
                {lcpDelay.toFixed(1)}s delay{" "}
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-mono ml-1 font-semibold",
                  lcpDelay <= 2.5
                    ? "bg-emerald-100 text-emerald-800"
                    : lcpDelay <= 4.0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                )}>
                  {lcpDelay <= 2.5 ? "Good (<2.5s)" : lcpDelay <= 4.0 ? "Needs Work" : "Critical Latency"}
                </span>
              </span>
            </div>

            <input
              type="range"
              min="0.4"
              max="6.0"
              step="0.1"
              value={lcpDelay}
              onChange={(e) => setLcpDelay(Number(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0.5s Fast</span>
              <span>1.8s Benchmark</span>
              <span>3.5s Slow</span>
              <span>6.0s+ Critical</span>
            </div>
          </div>
        </div>

        {/* Right: Synthesis & Computed Projected Return (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
              Funnel Loss Distribution
            </h2>
            <p className="text-[11px] text-slate-500 font-content mt-0.5">
              Cumulative monthly revenue leaks across user journeys:
            </p>

            <div className="mt-3.5 space-y-2.5 font-content text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Gauge className="size-3.5 text-slate-400" />
                  Load Latency & CWV Delay
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(calculations.speedRisk)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Shield className="size-3.5 text-slate-400" />
                  Trust & Security Abandonment
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(calculations.secRisk)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Search className="size-3.5 text-slate-400" />
                  SEO & Organic Search Leaks
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(calculations.seoRisk)}
                </span>
              </div>
            </div>
          </div>

          {/* 6. Computed Result Box (Toned down, earned result) */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 flex items-start gap-2.5">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed font-content">
              <strong>Projected Remediation ROI:</strong> Resolving the top audit bottlenecks recovers{" "}
              <strong className="text-emerald-700 font-mono">
                {formatCurrency(calculations.potentialRecovery)}
              </strong>{" "}
              ({timeframe === "monthly" ? "per month" : "per year"}).
            </p>
          </div>
        </div>
      </div>

      {/* 4. Single Source of Truth: Remediation Financial Impact Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900">
              Remediation Financial Impact Table
            </h2>
            <p className="text-xs text-slate-500 font-content mt-0.5">
              Prioritized audit bottlenecks ranked by financial return on engineering time.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {timeframe === "monthly" ? "Monthly projection" : "Annual projection"}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-content">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Audit Area</th>
                  <th className="px-4 py-3">Bottleneck Diagnosis</th>
                  <th className="px-4 py-3">Loss Factor</th>
                  <th className="px-4 py-3 text-right">Revenue at Risk</th>
                  <th className="px-4 py-3 text-right">Recoverable Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Gauge className="size-3.5 text-slate-400" />
                      Performance & CWV
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    LCP latency of ~{lcpDelay.toFixed(1)}s beyond the 0.8s benchmark
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono font-semibold text-rose-700 text-[11px]">
                      -{calculations.speedLossPercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(calculations.speedRisk)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                    +{formatCurrency(calculations.speedRisk * 0.85)}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Shield className="size-3.5 text-slate-400" />
                      Security & Trust
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Security header gaps and checkout trust warnings ({securityRiskLevel} risk)
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 font-mono font-semibold text-amber-700 text-[11px]">
                      -{calculations.secLossPercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(calculations.secRisk)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                    +{formatCurrency(calculations.secRisk * 0.9)}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Search className="size-3.5 text-slate-400" />
                      SEO & AEO
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Missing structured schemas and robots.txt crawler constraints
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-700 text-[11px]">
                      -{calculations.seoLossPercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(calculations.seoRisk)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                    +{formatCurrency(calculations.seoRisk * 0.75)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
