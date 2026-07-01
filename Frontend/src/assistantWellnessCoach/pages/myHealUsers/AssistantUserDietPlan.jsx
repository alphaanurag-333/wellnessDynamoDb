import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserDietPlanCatalogPanel } from "../../../components/UserDietPlanCatalogPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantCreateDietPlanAssignment,
  assistantDeleteDietPlanAssignment,
  assistantListUserDietPlanAssignments,
} from "../../api/assistantDietPlanAssignments.js";

const dietPlanAssignmentApi = {
  list: assistantListUserDietPlanAssignments,
  create: assistantCreateDietPlanAssignment,
  remove: assistantDeleteDietPlanAssignment,
};

export function AssistantUserDietPlan({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserDietPlanCatalogPanel
      token={assistantToken}
      userId={userId}
      api={dietPlanAssignmentApi}
      backTo={embedded ? null : "/assistant/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
