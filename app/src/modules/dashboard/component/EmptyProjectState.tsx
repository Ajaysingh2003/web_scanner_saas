import Link from "next/link";
import { Globe2, ArrowRight, Plus } from "lucide-react";

export function EmptyProjectState() {
  return (
    <div className="relative  mx-auto my-6 max-w-xl overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 p-8 text-center shadow-xs backdrop-blur-xs sm:p-12">
      {/* Subtle radial ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 size-40 rounded-full bg-gradient-to-b from-rose-400/15 via-rose-200/10 to-transparent blur-2xl"
      />

      {/* Centered Icon Container */}
      <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl border border-rose-200/60 bg-gradient-to-b from-rose-100/80 to-rose-50 text-rose-600 shadow-2xs">
        <Globe2 className="size-7 stroke-[1.75]" />
      </div>

      {/* Heading & Copy */}
      <div className="relative mt-5 space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
          Create your first project
        </h1>
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-zinc-600 sm:text-sm">
          Add a website to unlock automated vulnerability scanning, SSL checks,
          and performance insights.
        </p>
      </div>

      {/* Action CTA */}
      <div className="relative mt-7 flex items-center justify-center gap-3">
        <Link
          href="/dashboard/settings/project"
          className="bg-background-btn hover:bg-background-btn-hover group flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>Create project</span>
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}