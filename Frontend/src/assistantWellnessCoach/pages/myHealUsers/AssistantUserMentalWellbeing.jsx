import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserMentalWellbeingPanel } from "../../../components/UserMentalWellbeingPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantAssignMentalWellbeing,
  assistantListUserMentalWellbeing,
  assistantRemoveMentalWellbeing,
} from "../../api/assistantMentalWellbeing.js";

const mentalWellbeingApi = {
  list: assistantListUserMentalWellbeing,
  assign: assistantAssignMentalWellbeing,
  remove: assistantRemoveMentalWellbeing,
};

export function AssistantUserMentalWellbeing({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserMentalWellbeingPanel
      token={assistantToken}
      userId={userId}
      api={mentalWellbeingApi}
      backTo={embedded ? null : "/assistant/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
