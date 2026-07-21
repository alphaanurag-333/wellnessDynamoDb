import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { UserWellnessPrescriptionPanel } from "../../../../components/UserWellnessPrescriptionPanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminCreateWellnessPrescription,
  adminDeleteWellnessPrescription,
  adminListUserWellnessPrescriptions,
} from "../../../api/adminHealWellnessPrescriptions.js";

const wellnessPrescriptionApi = {
  list: adminListUserWellnessPrescriptions,
  create: adminCreateWellnessPrescription,
  remove: adminDeleteWellnessPrescription,
};

export function AdminUserWellnessPrescriptions({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <UserWellnessPrescriptionPanel
      token={adminToken}
      userId={userId}
      api={wellnessPrescriptionApi}
      backTo={embedded ? null : "/admin/users"}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
