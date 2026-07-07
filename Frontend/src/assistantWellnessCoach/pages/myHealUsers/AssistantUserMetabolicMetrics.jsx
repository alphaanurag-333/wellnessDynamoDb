import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserMetabolicMetricsPanel } from "../../../components/UserMetabolicMetricsPanel.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import { assistantGetMetabolicMetricsDashboard } from "../../api/assistantMetabolicMetrics.js";

const metabolicMetricsApi = {
  getDashboard: assistantGetMetabolicMetricsDashboard,
};

export function AssistantUserMetabolicMetrics({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  if (!embedded) {
    return null;
  }

  return (
    <UserMetabolicMetricsPanel
      token={assistantToken}
      userId={userId}
      api={metabolicMetricsApi}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
