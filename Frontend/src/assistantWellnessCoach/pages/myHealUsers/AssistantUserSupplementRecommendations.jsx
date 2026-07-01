import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserSupplementRecommendationsPanel } from "../../../components/UserSupplementRecommendationsPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantCreateSupplementRecommendation,
  assistantListUserSupplementRecommendations,
  assistantRemoveSupplementRecommendation,
} from "../../api/assistantSupplementRecommendations.js";

const supplementRecommendationApi = {
  list: assistantListUserSupplementRecommendations,
  create: assistantCreateSupplementRecommendation,
  remove: assistantRemoveSupplementRecommendation,
};

export function AssistantUserSupplementRecommendations({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserSupplementRecommendationsPanel
      token={assistantToken}
      userId={userId}
      api={supplementRecommendationApi}
      backTo={embedded ? null : "/assistant/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
