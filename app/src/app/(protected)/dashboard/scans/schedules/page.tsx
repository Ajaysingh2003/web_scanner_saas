import ScanSchedulesView from "@/modules/dashboard/view/ScanSchedulesView";
import ScanShell from "@/modules/dashboard/view/ScanShell";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

export default function ScanSchedulesPage() { return <ScanShell><ProjectDataBoundary><ScanSchedulesView /></ProjectDataBoundary></ScanShell>; }
