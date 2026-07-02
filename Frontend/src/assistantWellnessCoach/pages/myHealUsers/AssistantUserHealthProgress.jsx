import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserHealthProgressPanel } from "../../../components/UserHealthProgressPanel.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantGetHealthProgressSettings,
  assistantListHealthProgressWeight,
  assistantListHealthProgressGlucose,
  assistantListHealthProgressBloodPressure,
  assistantListHealthProgressMenstrualCycle,
  assistantListHealthProgressCondition,
} from "../../api/assistantHealthProgress.js";

const healthProgressApi = {
  getSettings: assistantGetHealthProgressSettings,
  listWeight: assistantListHealthProgressWeight,
  listGlucose: assistantListHealthProgressGlucose,
  listBloodPressure: assistantListHealthProgressBloodPressure,
  listMenstrualCycle: assistantListHealthProgressMenstrualCycle,
  listCondition: assistantListHealthProgressCondition,
};

export function AssistantUserHealthProgress({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  if (!embedded) {
    return null;
  }

  return (
    <UserHealthProgressPanel
      token={assistantToken}
      userId={userId}
      api={healthProgressApi}
      readOnly
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
