import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { UserMealTrackingPanel } from "../../../../components/UserMealTrackingPanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminGetUserMealTracking,
  adminCreateMealLog,
  adminUpdateMealLog,
  adminDeleteMealLog,
  adminUpdateMealTrackingMode,
} from "../../../api/adminHealMealTracking.js";
import { adminReviewMealLog } from "../../../api/adminMealReview.js";

const mealTrackingApi = {
  list: adminGetUserMealTracking,
  create: adminCreateMealLog,
  update: adminUpdateMealLog,
  remove: adminDeleteMealLog,
  updateMode: adminUpdateMealTrackingMode,
  review: (token, logId, payload) => adminReviewMealLog(token, logId, payload),
};

export function AdminUserMealTrackingPage({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <UserMealTrackingPanel
      token={adminToken}
      userId={userId}
      api={mealTrackingApi}
      backTo={embedded ? null : "/admin/users"}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
