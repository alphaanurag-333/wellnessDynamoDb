import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { UserSupplementDosagePanel } from "../../../../components/UserSupplementDosagePanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminCreateSupplementDosage,
  adminListUserSupplementDosages,
  adminStopSupplementDosage,
} from "../../../api/adminHealSupplementDosage.js";

const supplementDosageApi = {
  list: adminListUserSupplementDosages,
  create: adminCreateSupplementDosage,
  stop: adminStopSupplementDosage,
};

export function AdminUserSupplementDosage({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <UserSupplementDosagePanel
      token={adminToken}
      userId={userId}
      api={supplementDosageApi}
      backTo={embedded ? null : "/admin/users"}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
