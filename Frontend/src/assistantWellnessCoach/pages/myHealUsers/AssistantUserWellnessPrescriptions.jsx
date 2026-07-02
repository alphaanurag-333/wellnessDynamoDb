import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserWellnessPrescriptionPanel } from "../../../components/UserWellnessPrescriptionPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantCreateWellnessPrescription,
  assistantDeleteWellnessPrescription,
  assistantListUserWellnessPrescriptions,
} from "../../api/assistantWellnessPrescriptions.js";

const wellnessPrescriptionApi = {
  list: assistantListUserWellnessPrescriptions,
  create: assistantCreateWellnessPrescription,
  remove: assistantDeleteWellnessPrescription,
};

export function AssistantUserWellnessPrescriptions({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserWellnessPrescriptionPanel
      token={assistantToken}
      userId={userId}
      api={wellnessPrescriptionApi}
      backTo={embedded ? null : "/assistant/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
