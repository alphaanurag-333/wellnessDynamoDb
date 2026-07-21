import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserMetabolicMetricsPanel } from "../../../../components/UserMetabolicMetricsPanel.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminGetMetabolicMetricsDashboard,
  adminSaveFattyLiverMetric,
} from "../../../api/adminHealMetabolicMetrics.js";

const metabolicMetricsApi = {
  getDashboard: adminGetMetabolicMetricsDashboard,
  saveFattyLiverMetric: adminSaveFattyLiverMetric,
};

export function AdminUserMetabolicMetrics({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  if (!embedded) {
    return null;
  }

  return (
    <UserMetabolicMetricsPanel
      token={adminToken}
      userId={userId}
      api={metabolicMetricsApi}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
