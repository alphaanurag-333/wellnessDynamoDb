import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { PrakrutiAssessmentPanel } from "../../../components/PrakrutiAssessmentPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantDownloadPrakrutiQuestionsExport,
  assistantGetPrakrutiAssessment,
  assistantListPrakrutiQuestions,
  assistantListPrakrutiThingsToAvoid,
  assistantSavePrakrutiAssessment,
} from "../../api/assistantPrakrutiAssessment.js";

const prakrutiApi = {
  listQuestions: assistantListPrakrutiQuestions,
  listThingsToAvoid: assistantListPrakrutiThingsToAvoid,
  getAssessment: assistantGetPrakrutiAssessment,
  save: assistantSavePrakrutiAssessment,
  downloadExport: assistantDownloadPrakrutiQuestionsExport,
};

export function AssistantUserPrakrutiAssessment({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <PrakrutiAssessmentPanel
      token={assistantToken}
      userId={userId}
      api={prakrutiApi}
      backTo={embedded ? null : "/assistant/my-users"}
      embedded={embedded}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
