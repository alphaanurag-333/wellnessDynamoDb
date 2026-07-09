import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserCoachInsightPanel } from "../../../components/UserCoachInsightPanel.jsx";
import {
  coachGetUserCoachInsight,
  coachUpsertUserCoachInsight,
} from "../../api/coachCoachInsight.js";

export function UserCoachInsight({ embedded = false }) {
  const coachToken = useSelector((s) => s.auth.coachToken);
  const { userId } = useParams();

  return (
    <UserCoachInsightPanel
      token={coachToken}
      userId={userId}
      fetchInsight={coachGetUserCoachInsight}
      saveInsight={coachUpsertUserCoachInsight}
      embedded={embedded}
    />
  );
}
