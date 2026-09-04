import SecurityVulnerabilitiesView from "@/modules/dashboard/view/SecurityVulnerabilitiesView";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

export default function SecurityVulnerabilitiesPage() {
  return <ProjectDataBoundary><SecurityVulnerabilitiesView /></ProjectDataBoundary>;
}
