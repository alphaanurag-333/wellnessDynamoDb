import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserTestRecommendationsPanel } from "../../../components/UserTestRecommendationsPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachCreateTestRecommendation,
  coachDeleteTestRecommendation,
  coachListUserTestRecommendations,
  coachListUserLabReports,
} from "../../api/coachTestRecommendations.js";

const testRecommendationApi = {
  list: coachListUserTestRecommendations,
  create: coachCreateTestRecommendation,
  remove: coachDeleteTestRecommendation,
  listLabReports: coachListUserLabReports,
};

export function UserTestRecommendations() {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserTestRecommendationsPanel
      token={coachToken}
      userId={userId}
      api={testRecommendationApi}
      backTo="/coach/my-users"
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
