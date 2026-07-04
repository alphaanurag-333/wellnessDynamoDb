import { useDispatch, useSelector } from "react-redux";
import { logoutCoach } from "../../../store/authSlice.js";
import { PortalMonthlyChampionsPage } from "../../../components/PortalMonthlyChampionsPage.jsx";
import {
  coachListMonthlyChampions,
  coachGetMonthlyChampionById,
} from "../../api/coachMonthlyChampions.js";

export function CoachMonthlyChampionsPage() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <PortalMonthlyChampionsPage
      token={coachToken}
      onUnauthorized={() => dispatch(logoutCoach())}
      listChampions={coachListMonthlyChampions}
      getChampionById={coachGetMonthlyChampionById}
      title="Monthly champions"
    />
  );
}
