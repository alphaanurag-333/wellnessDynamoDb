import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { UserMentalWellbeingPanel } from "../../../../components/UserMentalWellbeingPanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminAssignMentalWellbeing,
  adminListUserMentalWellbeing,
  adminRemoveMentalWellbeing,
} from "../../../api/adminHealMentalWellbeing.js";

const mentalWellbeingApi = {
  list: adminListUserMentalWellbeing,
  assign: adminAssignMentalWellbeing,
  remove: adminRemoveMentalWellbeing,
};

export function AdminUserMentalWellbeing({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <UserMentalWellbeingPanel
      token={adminToken}
      userId={userId}
      api={mentalWellbeingApi}
      backTo={embedded ? null : "/admin/users"}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
