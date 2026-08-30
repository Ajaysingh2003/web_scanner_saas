import ScansView from "@/modules/dashboard/view/ScansView";
import ScanShell from "@/modules/dashboard/view/ScanShell";

function page() {
  return (
    <ScanShell>
      <ScansView />
    </ScanShell>
  );
}

export default page;
