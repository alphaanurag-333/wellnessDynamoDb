import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { PrakrutiAssessmentPanel } from "../../../components/PrakrutiAssessmentPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachDownloadPrakrutiQuestionsExport,
  coachGetPrakrutiAssessment,
  coachListPrakrutiQuestions,
  coachListPrakrutiThingsToAvoid,
  coachSavePrakrutiAssessment,
} from "../../api/coachPrakrutiAssessment.js";

const prakrutiApi = {
  listQuestions: coachListPrakrutiQuestions,
  listThingsToAvoid: coachListPrakrutiThingsToAvoid,
  getAssessment: coachGetPrakrutiAssessment,
  save: coachSavePrakrutiAssessment,
  downloadExport: coachDownloadPrakrutiQuestionsExport,
};

export function UserPrakrutiAssessment() {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <PrakrutiAssessmentPanel
      token={coachToken}
      userId={userId}
      api={prakrutiApi}
      backTo="/coach/my-users"
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
