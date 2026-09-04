import ScanCompareView from "@/modules/dashboard/view/ScanCompareView";
import ScanShell from "@/modules/dashboard/view/ScanShell";
import ProjectDataBoundary from "@/modules/dashboard/component/ProjectDataBoundary";

export default function ScanComparePage() { return <ScanShell><ProjectDataBoundary><ScanCompareView /></ProjectDataBoundary></ScanShell>; }
