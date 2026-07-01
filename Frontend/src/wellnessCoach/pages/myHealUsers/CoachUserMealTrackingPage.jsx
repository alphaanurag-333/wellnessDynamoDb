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
} from "../../api/coachMealTracking.js";

const mealTrackingApi = {
  list: coachGetUserMealTracking,
  create: coachCreateMealLog,
  update: coachUpdateMealLog,
  remove: coachDeleteMealLog,
};

export function CoachUserMealTrackingPage({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserMealTrackingPanel
      token={coachToken}
      userId={userId}
      api={mealTrackingApi}
      backTo={embedded ? null : "/coach/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
