import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { UserDietPlanCatalogPanel } from "../../../../components/UserDietPlanCatalogPanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminCreateDietPlanAssignment,
  adminDeleteDietPlanAssignment,
  adminListUserDietPlanAssignments,
} from "../../../api/adminDietPlanAssignments.js";

const dietPlanAssignmentApi = {
  list: adminListUserDietPlanAssignments,
  create: adminCreateDietPlanAssignment,
  remove: adminDeleteDietPlanAssignment,
};

export function AdminUserDietPlan({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <UserDietPlanCatalogPanel
      token={adminToken}
      userId={userId}
      api={dietPlanAssignmentApi}
      backTo={embedded ? null : "/admin/users"}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
