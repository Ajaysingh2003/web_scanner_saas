import UptimeView from "@/modules/dashboard/view/UptimeView";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

export default function UptimePage() {
  return <ProjectDataBoundary><UptimeView /></ProjectDataBoundary>;
}
