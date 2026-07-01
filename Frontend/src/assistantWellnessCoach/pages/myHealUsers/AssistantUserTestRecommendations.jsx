import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserTestRecommendationsPanel } from "../../../components/UserTestRecommendationsPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantCreateTestRecommendation,
  assistantDeleteTestRecommendation,
  assistantListUserTestRecommendations,
  assistantListUserLabReports,
} from "../../api/assistantTestRecommendations.js";

const testRecommendationApi = {
  list: assistantListUserTestRecommendations,
  create: assistantCreateTestRecommendation,
  remove: assistantDeleteTestRecommendation,
  listLabReports: assistantListUserLabReports,
};

export function AssistantUserTestRecommendations() {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserTestRecommendationsPanel
      token={assistantToken}
      userId={userId}
      api={testRecommendationApi}
      backTo="/assistant/my-users"
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
