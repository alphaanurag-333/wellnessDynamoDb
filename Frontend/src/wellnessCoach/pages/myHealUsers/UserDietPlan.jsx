import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserDietPlanCatalogPanel } from "../../../components/UserDietPlanCatalogPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachCreateDietPlanAssignment,
  coachDeleteDietPlanAssignment,
  coachListUserDietPlanAssignments,
} from "../../api/coachDietPlanAssignments.js";

const dietPlanAssignmentApi = {
  list: coachListUserDietPlanAssignments,
  create: coachCreateDietPlanAssignment,
  remove: coachDeleteDietPlanAssignment,
};

export function UserDietPlan() {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserDietPlanCatalogPanel
      token={coachToken}
      userId={userId}
      api={dietPlanAssignmentApi}
      backTo="/coach/my-users"
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
