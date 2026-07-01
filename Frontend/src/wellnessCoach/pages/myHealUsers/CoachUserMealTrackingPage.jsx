import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserMealTrackingPanel } from "../../../components/UserMealTrackingPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachGetUserMealTracking,
  coachCreateMealLog,
  coachUpdateMealLog,
  coachDeleteMealLog,
  coachUpdateMealTrackingMode,
} from "../../api/coachMealTracking.js";
import { coachReviewMealLog } from "../../api/coachMealReview.js";

const mealTrackingApi = {
  list: coachGetUserMealTracking,
  create: coachCreateMealLog,
  update: coachUpdateMealLog,
  remove: coachDeleteMealLog,
  updateMode: coachUpdateMealTrackingMode,
  review: (token, logId, payload) => coachReviewMealLog(token, logId, payload),
};

export function CoachUserMealTrackingPage() {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserMealTrackingPanel
      token={coachToken}
      userId={userId}
      api={mealTrackingApi}
      backTo="/coach/my-users"
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
