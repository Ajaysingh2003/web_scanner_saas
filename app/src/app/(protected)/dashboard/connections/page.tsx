import ConnectionsOverviewView from "@/modules/dashboard/view/ConnectionsOverviewView";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

export default function ConnectionsPage() {
  return <ProjectDataBoundary><ConnectionsOverviewView /></ProjectDataBoundary>;
}
