import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserPhysicalExercisesPanel } from "../../../components/UserPhysicalExercisesPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantAssignPhysicalExercises,
  assistantListUserPhysicalExercises,
  assistantRemovePhysicalExercise,
} from "../../api/assistantPhysicalExercises.js";

const physicalExerciseApi = {
  list: assistantListUserPhysicalExercises,
  assign: assistantAssignPhysicalExercises,
  remove: assistantRemovePhysicalExercise,
};

export function AssistantUserPhysicalExercises({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserPhysicalExercisesPanel
      token={assistantToken}
      userId={userId}
      api={physicalExerciseApi}
      backTo={embedded ? null : "/assistant/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
