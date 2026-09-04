import ConnectionsSupabaseView from "@/modules/dashboard/view/ConnectionsSupabaseView";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

export default function SupabasePage() {
  return <ProjectDataBoundary><ConnectionsSupabaseView /></ProjectDataBoundary>;
}
