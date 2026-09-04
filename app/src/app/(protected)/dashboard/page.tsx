import DashboardView from "@/modules/dashboard/view/DashboardView";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";
import React from "react";

function page() {
  return (
    <ProjectDataBoundary>
      <DashboardView />
    </ProjectDataBoundary>
  );
}

export default page;
