import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserDailyReflectionPanel } from "../../../components/UserDailyReflectionPanel.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import { assistantGetDailyReflectionSettings } from "../../api/assistantDailyReflection.js";

const dailyReflectionApi = {
  getSettings: assistantGetDailyReflectionSettings,
};

export function AssistantUserDailyReflection({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  if (!embedded) {
    return null;
  }

  return (
    <UserDailyReflectionPanel
      token={assistantToken}
      userId={userId}
      api={dailyReflectionApi}
      readOnly
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
