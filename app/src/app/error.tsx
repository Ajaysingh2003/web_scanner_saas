"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Mail } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log exception to console / telemetry
    console.error("[Scanlyst Application Error]", error);
  }, [error]);

  return (
    <div className="w-full bg-[#ffffff] text-slate-900 min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl border border-stone-200/90 bg-[#fafafa] shadow-xs">
        <div className="size-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
          <AlertTriangle className="size-6" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-600">
            SYSTEM EXCEPTION
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            Something went wrong
          </h1>
          <p className="font-content text-xs sm:text-sm text-slate-600 leading-relaxed">
            An unexpected error occurred while rendering this view. Our engineering telemetry has been notified.
          </p>
          {error.digest && (
            <p className="text-[10.5px] font-mono text-stone-400 pt-1">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="bg-background-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm hover:opacity-95 transition-all cursor-pointer w-full sm:w-auto"
          >
            <RefreshCw className="size-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors shadow-2xs cursor-pointer w-full sm:w-auto"
          >
            <Home className="size-3.5 text-stone-400" />
            <span>Home</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-stone-200/70 text-[11px] font-mono text-stone-400">
          Need assistance? Reach out to{" "}
          <a
            href={`mailto:${siteConfig.supportEmail}`}
            className="text-slate-700 underline hover:text-slate-950"
          >
            {siteConfig.supportEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
