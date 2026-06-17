import { PortalDashboardIntro } from "../../admin/components/PortalProfileLayout.jsx";

export function AssistantDashboardPage() {
  return (
    <div className="page-stack">
      <PortalDashboardIntro
        title="Dashboard"
        subtitle="Welcome back! Here is your assistant overview."
      />
    </div>
  );
}
