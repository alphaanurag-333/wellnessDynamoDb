import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserCoachInsightPanel } from "../../../../components/UserCoachInsightPanel.jsx";
import {
  adminGetUserCoachInsight,
  adminUpsertUserCoachInsight,
} from "../../../api/adminHealCoachInsight.js";

export function AdminUserCoachInsight({ embedded = false }) {
  const adminToken = useSelector((s) => s.auth.adminToken);
  const { userId } = useParams();

  return (
    <UserCoachInsightPanel
      token={adminToken}
      userId={userId}
      fetchInsight={adminGetUserCoachInsight}
      saveInsight={adminUpsertUserCoachInsight}
      embedded={embedded}
    />
  );
}
