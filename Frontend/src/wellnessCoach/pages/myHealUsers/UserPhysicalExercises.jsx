import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserPhysicalExercisesPanel } from "../../../components/UserPhysicalExercisesPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachAssignPhysicalExercises,
  coachListUserPhysicalExercises,
  coachRemovePhysicalExercise,
} from "../../api/coachPhysicalExercises.js";

const physicalExerciseApi = {
  list: coachListUserPhysicalExercises,
  assign: coachAssignPhysicalExercises,
  remove: coachRemovePhysicalExercise,
};

export function UserPhysicalExercises({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserPhysicalExercisesPanel
      token={coachToken}
      userId={userId}
      api={physicalExerciseApi}
      backTo={embedded ? null : "/coach/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
