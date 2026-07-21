import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserHealthProgressPanel } from "../../../../components/UserHealthProgressPanel.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminGetHealthProgressSettings,
  adminUpdateHealthProgressSettings,
  adminListHealthProgressWeight,
  adminListHealthProgressGlucose,
  adminListHealthProgressBloodPressure,
  adminListHealthProgressMenstrualCycle,
  adminListHealthProgressCondition,
} from "../../../api/adminHealHealthProgress.js";
import {
  adminGetUserSleepTracking,
  adminGetUserHeartRateTracking,
} from "../../../api/adminHealUsers.js";

const healthProgressApi = {
  getSettings: adminGetHealthProgressSettings,
  updateSettings: adminUpdateHealthProgressSettings,
  listWeight: adminListHealthProgressWeight,
  listGlucose: adminListHealthProgressGlucose,
  listBloodPressure: adminListHealthProgressBloodPressure,
  listMenstrualCycle: adminListHealthProgressMenstrualCycle,
  listCondition: adminListHealthProgressCondition,
  listSleep: adminGetUserSleepTracking,
  listHeartRate: adminGetUserHeartRateTracking,
};

export function AdminUserHealthProgress({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  if (!embedded) {
    return null;
  }

  return (
    <UserHealthProgressPanel
      token={adminToken}
      userId={userId}
      api={healthProgressApi}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
