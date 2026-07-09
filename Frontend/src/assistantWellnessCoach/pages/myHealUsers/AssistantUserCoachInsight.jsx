import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserCoachInsightPanel } from "../../../components/UserCoachInsightPanel.jsx";
import {
  assistantGetUserCoachInsight,
  assistantUpsertUserCoachInsight,
} from "../../api/assistantCoachInsight.js";

export function AssistantUserCoachInsight({ embedded = false }) {
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const { userId } = useParams();

  return (
    <UserCoachInsightPanel
      token={assistantToken}
      userId={userId}
      fetchInsight={assistantGetUserCoachInsight}
      saveInsight={assistantUpsertUserCoachInsight}
      embedded={embedded}
    />
  );
}
