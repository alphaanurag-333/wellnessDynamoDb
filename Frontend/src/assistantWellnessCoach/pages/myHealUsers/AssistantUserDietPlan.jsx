import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserDietPlanPanel } from "../../../components/UserDietPlanPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantDeleteDietPlan,
  assistantListUserDietPlans,
  assistantUploadDietPlan,
} from "../../api/assistantDietPlans.js";

const dietPlanApi = {
  list: assistantListUserDietPlans,
  upload: assistantUploadDietPlan,
  remove: assistantDeleteDietPlan,
};

export function AssistantUserDietPlan() {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserDietPlanPanel
      token={assistantToken}
      userId={userId}
      api={dietPlanApi}
      backTo="/assistant/my-users"
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
