import ConnectionsProvidersView from "@/modules/dashboard/view/ConnectionsProvidersView";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

export default function ProvidersPage() {
  return <ProjectDataBoundary><ConnectionsProvidersView /></ProjectDataBoundary>;
}
