import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserMealTrackingPanel } from "../../../components/UserMealTrackingPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantGetUserMealTracking,
  assistantCreateMealLog,
  assistantUpdateMealLog,
  assistantDeleteMealLog,
} from "../../api/assistantMealTracking.js";

const mealTrackingApi = {
  list: assistantGetUserMealTracking,
  create: assistantCreateMealLog,
  update: assistantUpdateMealLog,
  remove: assistantDeleteMealLog,
};

export function AssistantUserMealTrackingPage({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserMealTrackingPanel
      token={assistantToken}
      userId={userId}
      api={mealTrackingApi}
      backTo={embedded ? null : "/assistant/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
