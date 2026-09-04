import MonitoringOverviewView from "@/modules/dashboard/view/MonitoringOverviewView";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

export default function MonitoringPage() {
  return <ProjectDataBoundary><MonitoringOverviewView /></ProjectDataBoundary>;
}
