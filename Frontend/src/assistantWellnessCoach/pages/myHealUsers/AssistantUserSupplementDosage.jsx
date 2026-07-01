import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserSupplementDosagePanel } from "../../../components/UserSupplementDosagePanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantCreateSupplementDosage,
  assistantListUserSupplementDosages,
  assistantStopSupplementDosage,
} from "../../api/assistantSupplementDosage.js";

const supplementDosageApi = {
  list: assistantListUserSupplementDosages,
  create: assistantCreateSupplementDosage,
  stop: assistantStopSupplementDosage,
};

export function AssistantUserSupplementDosage({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserSupplementDosagePanel
      token={assistantToken}
      userId={userId}
      api={supplementDosageApi}
      backTo={embedded ? null : "/assistant/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
