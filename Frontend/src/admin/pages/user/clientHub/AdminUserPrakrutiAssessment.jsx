import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { PrakrutiAssessmentPanel } from "../../../../components/PrakrutiAssessmentPanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminDownloadPrakrutiQuestionsExport,
  adminGetPrakrutiAssessment,
  adminListPrakrutiQuestions,
  adminListPrakrutiThingsToAvoid,
  adminSavePrakrutiAssessment,
} from "../../../api/adminHealPrakrutiAssessment.js";

const prakrutiApi = {
  listQuestions: adminListPrakrutiQuestions,
  listThingsToAvoid: adminListPrakrutiThingsToAvoid,
  getAssessment: adminGetPrakrutiAssessment,
  save: adminSavePrakrutiAssessment,
  downloadExport: adminDownloadPrakrutiQuestionsExport,
};

export function AdminUserPrakrutiAssessment({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <PrakrutiAssessmentPanel
      token={adminToken}
      userId={userId}
      api={prakrutiApi}
      backTo={embedded ? null : "/admin/users"}
      embedded={embedded}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
