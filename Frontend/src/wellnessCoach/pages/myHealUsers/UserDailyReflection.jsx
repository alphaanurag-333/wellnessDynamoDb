import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserDailyReflectionPanel } from "../../../components/UserDailyReflectionPanel.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachGetDailyReflectionSettings,
  coachUpdateDailyReflectionSettings,
} from "../../api/coachDailyReflection.js";

const dailyReflectionApi = {
  getSettings: coachGetDailyReflectionSettings,
  updateSettings: coachUpdateDailyReflectionSettings,
};

export function UserDailyReflection({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  if (!embedded) {
    return null;
  }

  return (
    <UserDailyReflectionPanel
      token={coachToken}
      userId={userId}
      api={dailyReflectionApi}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
