import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserHealthProgressPanel } from "../../../components/UserHealthProgressPanel.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachGetHealthProgressSettings,
  coachUpdateHealthProgressSettings,
  coachListHealthProgressWeight,
  coachListHealthProgressGlucose,
  coachListHealthProgressBloodPressure,
  coachListHealthProgressMenstrualCycle,
  coachListHealthProgressCondition,
} from "../../api/coachHealthProgress.js";
import { coachGetUserSleepTracking } from "../../api/coachSleepTracking.js";
import { coachGetUserHeartRateTracking } from "../../api/coachHeartRateTracking.js";

const healthProgressApi = {
  getSettings: coachGetHealthProgressSettings,
  updateSettings: coachUpdateHealthProgressSettings,
  listWeight: coachListHealthProgressWeight,
  listGlucose: coachListHealthProgressGlucose,
  listBloodPressure: coachListHealthProgressBloodPressure,
  listMenstrualCycle: coachListHealthProgressMenstrualCycle,
  listCondition: coachListHealthProgressCondition,
  listSleep: coachGetUserSleepTracking,
  listHeartRate: coachGetUserHeartRateTracking,
};

export function UserHealthProgress({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  if (!embedded) {
    return null;
  }

  return (
    <UserHealthProgressPanel
      token={coachToken}
      userId={userId}
      api={healthProgressApi}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
