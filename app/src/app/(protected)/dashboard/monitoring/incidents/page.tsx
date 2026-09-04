import MonitoringIncidentsView from "@/modules/dashboard/view/MonitoringIncidentsView";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

export default function IncidentsPage() {
  return <ProjectDataBoundary><MonitoringIncidentsView /></ProjectDataBoundary>;
}
