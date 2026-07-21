import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { UserPhysicalExercisesPanel } from "../../../../components/UserPhysicalExercisesPanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminAssignPhysicalExercises,
  adminListUserPhysicalExercises,
  adminRemovePhysicalExercise,
} from "../../../api/adminHealPhysicalExercises.js";

const physicalExerciseApi = {
  list: adminListUserPhysicalExercises,
  assign: adminAssignPhysicalExercises,
  remove: adminRemovePhysicalExercise,
};

export function AdminUserPhysicalExercises({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <UserPhysicalExercisesPanel
      token={adminToken}
      userId={userId}
      api={physicalExerciseApi}
      backTo={embedded ? null : "/admin/users"}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
