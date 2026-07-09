import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserMetabolicMetricsPanel } from "../../../components/UserMetabolicMetricsPanel.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachGetMetabolicMetricsDashboard,
  coachSaveFattyLiverMetric,
} from "../../api/coachMetabolicMetrics.js";

const metabolicMetricsApi = {
  getDashboard: coachGetMetabolicMetricsDashboard,
  saveFattyLiverMetric: coachSaveFattyLiverMetric,
};

export function UserMetabolicMetrics({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  if (!embedded) {
    return null;
  }

  return (
    <UserMetabolicMetricsPanel
      token={coachToken}
      userId={userId}
      api={metabolicMetricsApi}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
