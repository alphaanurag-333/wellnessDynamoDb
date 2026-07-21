import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { UserTestRecommendationsPanel } from "../../../../components/UserTestRecommendationsPanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminCreateTestRecommendation,
  adminDeleteTestRecommendation,
  adminListUserTestRecommendations,
  adminListUserLabReports,
} from "../../../api/adminHealTestRecommendations.js";

const testRecommendationApi = {
  list: adminListUserTestRecommendations,
  create: adminCreateTestRecommendation,
  remove: adminDeleteTestRecommendation,
  listLabReports: adminListUserLabReports,
};

export function AdminUserTestRecommendations({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <UserTestRecommendationsPanel
      token={adminToken}
      userId={userId}
      api={testRecommendationApi}
      backTo={embedded ? null : "/admin/users"}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
