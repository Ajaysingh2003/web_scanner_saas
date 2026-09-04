import React from "react";
import Link from "next/link";
import { ArrowRight, Search, ShieldAlert, Home, Layers } from "lucide-react";
import { AnimatedFooter } from "@/components/ui/animated-footer";
import NavBar from "@/base-component/NavBar";

export default function NotFound() {
  return (
    <div className="w-full bg-[#ffffff] text-slate-900 min-h-screen flex flex-col justify-between">
      {/* Top Navbar */}
      <NavBar />

      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center space-y-8 my-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-mono font-semibold uppercase tracking-wider">
          <ShieldAlert className="size-3.5" />
          <span>404 // RESOURCE NOT FOUND</span>
        </div>

        {/* Big Code & Title */}
        <div className="space-y-3">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-950">
            Page Not Found
          </h1>
          <p className="font-content text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            The page, scanner dossier, or report you requested does not exist or has been relocated to our updated catalog.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/scans"
            className="bg-background-btn inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold shadow-xs hover:shadow-sm hover:opacity-95 transition-all cursor-pointer w-full sm:w-auto"
          >
            <span>Browse All 41 Scanners</span>
            <ArrowRight className="size-4" />
          </Link>

          <Link
            href="/solutions"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors shadow-2xs cursor-pointer w-full sm:w-auto"
          >
            <Layers className="size-4 text-stone-400" />
            <span>View Solutions</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors shadow-2xs cursor-pointer w-full sm:w-auto"
          >
            <Home className="size-4 text-stone-400" />
            <span>Return Home</span>
          </Link>
        </div>

        {/* Popular Scans Fallback */}
        <div className="pt-8 border-t border-stone-200/80 max-w-xl mx-auto space-y-3 text-left">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
            Popular Scanners
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <Link
              href="/scans/sqli"
              className="p-2.5 rounded-lg border border-stone-200 bg-[#fafafa] hover:bg-white hover:border-stone-300 text-slate-700 hover:text-rose-600 transition-colors"
            >
              → SQL Injection Scanner
            </Link>
            <Link
              href="/scans/security-headers"
              className="p-2.5 rounded-lg border border-stone-200 bg-[#fafafa] hover:bg-white hover:border-stone-300 text-slate-700 hover:text-rose-600 transition-colors"
            >
              → Security Headers Scanner
            </Link>
            <Link
              href="/scans/core-web-vitals"
              className="p-2.5 rounded-lg border border-stone-200 bg-[#fafafa] hover:bg-white hover:border-stone-300 text-slate-700 hover:text-rose-600 transition-colors"
            >
              → Core Web Vitals Scanner
            </Link>
            <Link
              href="/scans/accessibility-wcag"
              className="p-2.5 rounded-lg border border-stone-200 bg-[#fafafa] hover:bg-white hover:border-stone-300 text-slate-700 hover:text-rose-600 transition-colors"
            >
              → WCAG 2.1 Accessibility
            </Link>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <AnimatedFooter />
    </div>
  );
}
