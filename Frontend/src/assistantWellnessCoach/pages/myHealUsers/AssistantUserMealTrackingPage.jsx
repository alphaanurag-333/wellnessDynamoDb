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
  assistantUpdateMealTrackingMode,
} from "../../api/assistantMealTracking.js";
import { assistantReviewMealLog } from "../../api/assistantMealReview.js";

const mealTrackingApi = {
  list: assistantGetUserMealTracking,
  create: assistantCreateMealLog,
  update: assistantUpdateMealLog,
  remove: assistantDeleteMealLog,
  updateMode: assistantUpdateMealTrackingMode,
  review: (token, logId, payload) => assistantReviewMealLog(token, logId, payload),
};

export function AssistantUserMealTrackingPage() {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserMealTrackingPanel
      token={assistantToken}
      userId={userId}
      api={mealTrackingApi}
      backTo="/assistant/my-users"
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
