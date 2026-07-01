import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { LaunchAssessmentPanel } from "../../../components/LaunchAssessmentPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantDownloadLaunchQuestionsExport,
  assistantGetLaunchAssessmentByDate,
  assistantListLaunchAssessments,
  assistantListLaunchFocusAreas,
  assistantListLaunchQuestions,
  assistantSaveLaunchAssessment,
  assistantUpdateLaunchAssessment,
} from "../../api/assistantLaunchAssessment.js";

const launchApi = {
  listQuestions: assistantListLaunchQuestions,
  listFocusAreas: assistantListLaunchFocusAreas,
  listAssessments: assistantListLaunchAssessments,
  getByDate: assistantGetLaunchAssessmentByDate,
  save: assistantSaveLaunchAssessment,
  update: assistantUpdateLaunchAssessment,
  downloadExport: assistantDownloadLaunchQuestionsExport,
};

export function AssistantUserLaunchAssessment({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <LaunchAssessmentPanel
      token={assistantToken}
      userId={userId}
      api={launchApi}
      backTo={embedded ? null : "/assistant/my-users"}
      embedded={embedded}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
