import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { LaunchAssessmentPanel } from "../../../components/LaunchAssessmentPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachListLaunchFocusAreas,
  coachDownloadLaunchQuestionsExport,
  coachGetLaunchAssessmentByDate,
  coachListLaunchAssessments,
  coachListLaunchQuestions,
  coachSaveLaunchAssessment,
  coachUpdateLaunchAssessment,
} from "../../api/coachLaunchAssessment.js";

const launchApi = {
  listQuestions: coachListLaunchQuestions,
  listFocusAreas: coachListLaunchFocusAreas,
  listAssessments: coachListLaunchAssessments,
  getByDate: coachGetLaunchAssessmentByDate,
  save: coachSaveLaunchAssessment,
  update: coachUpdateLaunchAssessment,
  downloadExport: coachDownloadLaunchQuestionsExport,
};

export function UserLaunchAssessment({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <LaunchAssessmentPanel
      token={coachToken}
      userId={userId}
      api={launchApi}
      backTo={embedded ? null : "/coach/my-users"}
      embedded={embedded}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
