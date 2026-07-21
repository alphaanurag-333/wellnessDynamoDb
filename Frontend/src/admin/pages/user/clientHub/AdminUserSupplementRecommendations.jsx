import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { UserSupplementRecommendationsPanel } from "../../../../components/UserSupplementRecommendationsPanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminCreateSupplementRecommendation,
  adminListUserSupplementRecommendations,
  adminRemoveSupplementRecommendation,
} from "../../../api/adminHealSupplementRecommendations.js";

const supplementRecommendationApi = {
  list: adminListUserSupplementRecommendations,
  create: adminCreateSupplementRecommendation,
  remove: adminRemoveSupplementRecommendation,
};

export function AdminUserSupplementRecommendations({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <UserSupplementRecommendationsPanel
      token={adminToken}
      userId={userId}
      api={supplementRecommendationApi}
      backTo={embedded ? null : "/admin/users"}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
