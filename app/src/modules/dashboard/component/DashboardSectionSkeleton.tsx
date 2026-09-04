import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSectionSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8" aria-label="Loading page" role="status">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><Skeleton className="h-5 w-40" /></div>
        <div className="space-y-4 p-5">
          {Array.from({ length: rows }).map((_, index) => <Skeleton key={index} className="h-12 w-full rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}
