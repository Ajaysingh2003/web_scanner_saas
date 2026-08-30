import DashboardView from "@/modules/dashboard/view/DashboardView";
import React, { Suspense } from "react";

function page() {
  return (
    <Suspense fallback={<div className="h-40 w-full animate-pulse bg-slate-100 rounded-3xl" />}>
      <DashboardView />
    </Suspense>
  );
}

export default page;