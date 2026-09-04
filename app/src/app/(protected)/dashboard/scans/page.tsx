import ScansView from "@/modules/dashboard/view/ScansView";
import ScanShell from "@/modules/dashboard/view/ScanShell";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

function page() {
  return (
    <ScanShell>
      <ProjectDataBoundary><ScansView /></ProjectDataBoundary>
    </ScanShell>
  );
}

export default page;
