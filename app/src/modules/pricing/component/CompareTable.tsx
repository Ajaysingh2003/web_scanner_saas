"use client";

import React from "react";
import { Check, Minus, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Cell = string | true | false;

interface CompareGroup {
  label: string;
  description?: string;
  rows: { label: string; tooltip?: string; values: [Cell, Cell, Cell, Cell] }[];
}

const TIERS = [
  { name: "Free", price: "$0", popular: false },
  { name: "Starter", price: "$19", popular: false },
  { name: "Pro", price: "$39", popular: true },
  { name: "Business", price: "$79", popular: false },
] as const;

const GROUPS: CompareGroup[] = [
  {
    label: "Scanning & Monitoring",
    description: "Limits and intervals",
    rows: [
      { label: "Monitored domains", values: ["1", "2", "5", "25"] },
      {
        label: "Full audits / month",
        values: ["5", "50", "250", "Unlimited"],
      },
      {
        label: "Automated daily monitoring",
        values: [false, false, true, true],
      },
      {
        label: "Hourly & CI/CD schedules",
        values: [false, false, false, true],
      },
      {
        label: "Uptime heartbeat (24/7)",
        values: [false, false, true, true],
      },
    ],
  },
  {
    label: "Findings & Remediation",
    description: "Inspection depth and fixes",
    rows: [
      {
        label: "Headers, TLS & DNS health checks",
        values: [true, true, true, true],
      },
      {
        label: "Full evidence & reproduction logs",
        values: ["Preview", true, true, true],
      },
      {
        label: "Copy-paste code & config diffs",
        values: [false, true, true, true],
      },
      {
        label: "CORS & secret-leak discovery",
        values: [false, true, true, true],
      },
      {
        label: "1-click retest verification",
        values: [false, true, true, true],
      },
      {
        label: "Scan diff & regression engine",
        values: [false, false, true, true],
      },
      {
        label: "Supabase & Postgres RLS audits",
        values: [false, false, true, true],
      },
    ],
  },
  {
    label: "Reporting & Integrations",
    description: "Exports and webhooks",
    rows: [
      {
        label: "Executive PDF exports",
        values: [false, true, true, true],
      },
      {
        label: "Public & shareable report links",
        values: [false, false, true, true],
      },
      {
        label: "Slack & Discord webhooks",
        values: [false, false, true, true],
      },
      {
        label: "White-label reports + custom branding",
        values: [false, false, false, true],
      },
    ],
  },
  {
    label: "Team & Workspaces",
    description: "API keys and controls",
    rows: [
      { label: "Active API keys", values: ["1", "2", "5", "25"] },
      {
        label: "MCP server (Cursor & Claude)",
        values: [true, true, true, true],
      },
      {
        label: "Team workspaces & seat invites",
        values: [false, false, false, true],
      },
      {
        label: "Isolated client workspaces",
        values: [false, false, false, true],
      },
      {
        label: "Agency white-glove audit rights",
        values: [false, false, false, true],
      },
      {
        label: "Priority engineering SLA",
        values: [false, false, false, true],
      },
    ],
  },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="inline-flex size-4 items-center justify-center rounded-full bg-green-400 text-white dark:bg-emerald-950/40 dark:text-emerald-400">
        <Check className="size-2.5" strokeWidth={2.5} />
      </span>
    );
  }

  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-neutral-300">
        <Minus className="size-3" strokeWidth={2} />
      </span>
    );
  }

  const isUnlimited = typeof value === "string" && value.toLowerCase().includes("unlimited");
  const isPreview = typeof value === "string" && value.toLowerCase().includes("preview");

  return (
    <span
      className={cn(
        "inline-block text-[11.5px] font-medium",
        isUnlimited && "font-semibold text-neutral-900",
        isPreview && "rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono text-neutral-500",
        !isUnlimited && !isPreview && "text-neutral-600",
      )}
    >
      {value}
    </span>
  );
}

export default function CompareTable() {
  return (
    <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-2xs">
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-[620px] border-collapse text-left">
          {/* Header */}
            <thead>
            <tr className="border-b border-neutral-200/80 bg-neutral-50/70">
              <th className="w-[40%] px-4 py-3 align-bottom text-[11px] font-mono font-medium uppercase tracking-wider text-neutral-400">
                Features
              </th>

              {TIERS.map((tier) => (
                <th
                  key={tier.name}
                  className={cn(
                    "w-[15%] px-3 py-3 text-center align-bottom",
                    tier.popular && "bg-neutral-100/40",
                  )}
                >

                  <div className="flex flex-col gap-3 items-center justify-end">
                    {tier.popular ? (
                     <span className="inline-flex items-center rounded-full bg-neutral-900 px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-white shadow-2xs ring-1 ring-white/10">
  Popular
</span>
                    ) : (
                      <span className="h-4" />
                    )}
                    <span className="text-[12px] font-semibold text-neutral-800">
                      {tier.name}
                    </span>
                    <span className="font-mono text-[11.5px] font-medium text-neutral-500">
                      {tier.price}
                      <span className="text-[9.5px] font-normal text-neutral-400 font-sans">
                        /mo
                      </span>
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>


          {/* Body */}
          {GROUPS.map((group) => (
            <tbody key={group.label} className="divide-y divide-neutral-100">
              {/* Category Bar */}
              <tr>
                <td
                  colSpan={5}
                  className="bg-neutral-50/50 px-4 py-1.5 border-y border-neutral-100"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      {group.label}
                    </span>
                    {group.description && (
                      <span className="hidden sm:inline font-mono text-[9.5px] text-neutral-400">
                        {group.description}
                      </span>
                    )}
                  </div>
                </td>
              </tr>

              {/* Rows */}
              {group.rows.map((row) => (
                <tr
                  key={row.label}
                  className="hover:bg-neutral-50/50 transition-colors"
                >
                  <td className="px-4 py-2 text-[12px] text-neutral-600">
                    <span className="inline-flex items-center gap-1.5">
                      {row.label}
                      {row.tooltip && (
                        <span title={row.tooltip}>
                          <HelpCircle className="size-3 text-neutral-300 cursor-help" />
                        </span>
                      )}
                    </span>
                  </td>

                  {row.values.map((value, i) => {
                    const isPro = TIERS[i].popular;
                    return (
                      <td
                        key={i}
                        className={cn(
                          "px-3 py-2 text-center align-middle",
                          isPro && "bg-neutral-100/30",
                        )}
                      >
                        <CellValue value={value} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {/* Footer info line */}
      <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/40 px-4 py-2 text-[10.5px] font-mono text-neutral-400">
        <span>Resets monthly</span>
        <span>Preview includes finding titles; fixes require Starter+</span>
      </div>
    </div>
  );
}