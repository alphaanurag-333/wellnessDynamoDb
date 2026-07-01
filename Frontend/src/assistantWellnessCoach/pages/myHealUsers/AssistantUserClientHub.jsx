import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ClientHubPage } from "../../../components/ClientHubPage.jsx";
import { assistantGetUserWaterTracking } from "../../api/assistantHealUsers.js";
import { logoutAssistant } from "../../../store/authSlice.js";
import { AssistantUserWaterTrackingPage } from "./AssistantUserWaterTrackingPage.jsx";
import { AssistantUserStepsTrackingPage } from "./AssistantUserStepsTrackingPage.jsx";
import { UserReminders } from "../userReminders/UserReminders.jsx";
import { AssistantUserDietPlan } from "./AssistantUserDietPlan.jsx";
import { AssistantUserTestRecommendations } from "./AssistantUserTestRecommendations.jsx";
import { AssistantUserPhysicalExercises } from "./AssistantUserPhysicalExercises.jsx";
import { AssistantUserMealTrackingPage } from "./AssistantUserMealTrackingPage.jsx";
import { AssistantUserLaunchAssessment } from "./AssistantUserLaunchAssessment.jsx";
import { AssistantUserPrakrutiAssessment } from "./AssistantUserPrakrutiAssessment.jsx";

function renderAssistantTab(tab, embedded) {
  switch (tab) {
    case "water":
      return <AssistantUserWaterTrackingPage embedded={embedded} />;
    case "steps":
      return <AssistantUserStepsTrackingPage embedded={embedded} />;
    case "reminders":
      return <UserReminders embedded={embedded} />;
    case "diet-plan":
      return <AssistantUserDietPlan embedded={embedded} />;
    case "internal-parameters":
      return <AssistantUserTestRecommendations embedded={embedded} />;
    case "physical-exercises":
      return <AssistantUserPhysicalExercises embedded={embedded} />;
    case "meal-tracking":
      return <AssistantUserMealTrackingPage embedded={embedded} />;
    case "launch-assessment":
      return <AssistantUserLaunchAssessment embedded={embedded} />;
    case "prakruti-assessment":
      return <AssistantUserPrakrutiAssessment embedded={embedded} />;
    default:
      return null;
  }
}

export function AssistantUserClientHub() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  const fetchUser = useCallback(
    async (userId) => {
      if (!assistantToken) return null;
      try {
        const result = await assistantGetUserWaterTracking(assistantToken, userId, { days: 7 });
        return result.user;
      } catch (e) {
        if (e?.status === 401) dispatch(logoutAssistant());
        throw e;
      }
    },
    [assistantToken, dispatch]
  );

  return (
    <ClientHubPage
      listPath="/assistant/my-users"
      fetchUser={fetchUser}
      renderTab={(tab, { embedded }) => renderAssistantTab(tab, embedded)}
    />
  );
}
