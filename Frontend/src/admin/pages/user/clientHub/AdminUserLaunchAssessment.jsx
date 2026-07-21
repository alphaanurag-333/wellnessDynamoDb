import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { LaunchAssessmentPanel } from "../../../../components/LaunchAssessmentPanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminDownloadLaunchQuestionsExport,
  adminGetLaunchAssessmentByDate,
  adminListLaunchAssessments,
  adminListLaunchFocusAreas,
  adminListLaunchQuestions,
  adminSaveLaunchAssessment,
  adminUpdateLaunchAssessment,
} from "../../../api/adminHealLaunchAssessment.js";

const launchApi = {
  listQuestions: adminListLaunchQuestions,
  listFocusAreas: adminListLaunchFocusAreas,
  listAssessments: adminListLaunchAssessments,
  getByDate: adminGetLaunchAssessmentByDate,
  save: adminSaveLaunchAssessment,
  update: adminUpdateLaunchAssessment,
  downloadExport: adminDownloadLaunchQuestionsExport,
};

export function AdminUserLaunchAssessment({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <LaunchAssessmentPanel
      token={adminToken}
      userId={userId}
      api={launchApi}
      backTo={embedded ? null : "/admin/users"}
      embedded={embedded}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
