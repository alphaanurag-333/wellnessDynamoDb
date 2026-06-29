import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserDietPlanPanel } from "../../../components/UserDietPlanPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachDeleteDietPlan,
  coachListUserDietPlans,
  coachUploadDietPlan,
} from "../../api/coachDietPlans.js";

const dietPlanApi = {
  list: coachListUserDietPlans,
  upload: coachUploadDietPlan,
  remove: coachDeleteDietPlan,
};

export function UserDietPlan() {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserDietPlanPanel
      token={coachToken}
      userId={userId}
      api={dietPlanApi}
      backTo="/coach/my-users"
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
