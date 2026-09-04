import ScanHistoryView from "@/modules/dashboard/view/ScanHistoryView";
import ScanShell from "@/modules/dashboard/view/ScanShell";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

export default function ScanHistoryPage() { return <ScanShell><ProjectDataBoundary><ScanHistoryView /></ProjectDataBoundary></ScanShell>; }
