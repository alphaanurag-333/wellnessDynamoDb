import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserSupplementRecommendationsPanel } from "../../../components/UserSupplementRecommendationsPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachCreateSupplementRecommendation,
  coachListUserSupplementRecommendations,
  coachRemoveSupplementRecommendation,
} from "../../api/coachSupplementRecommendations.js";

const supplementRecommendationApi = {
  list: coachListUserSupplementRecommendations,
  create: coachCreateSupplementRecommendation,
  remove: coachRemoveSupplementRecommendation,
};

export function UserSupplementRecommendations() {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserSupplementRecommendationsPanel
      token={coachToken}
      userId={userId}
      api={supplementRecommendationApi}
      backTo="/coach/my-users"
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
