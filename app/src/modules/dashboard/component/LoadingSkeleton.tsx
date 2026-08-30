"use client";

export default function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-96 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-slate-200"
          />
        ))}
      </div>
      <div className="mt-6 h-56 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
