import { useOutletContext } from "react-router-dom";
import { UpdatedAdminDashboard } from "../components/UpdatedAdminDashboard.jsx";

export function DashboardPage() {
  const { showToast } = useOutletContext();
  return <UpdatedAdminDashboard onToast={showToast} />;
}
