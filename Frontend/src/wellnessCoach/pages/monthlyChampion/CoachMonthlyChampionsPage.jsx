import { Outlet } from "react-router-dom";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutCoach } from "../../../store/authSlice.js";
import { PortalMonthlyChampionList } from "../../../components/monthlyChampion/PortalMonthlyChampionList.jsx";
import { PortalMonthlyChampionView } from "../../../components/monthlyChampion/PortalMonthlyChampionView.jsx";
import {
  coachGetMonthlyChampionById,
  coachListMonthlyChampions,
} from "../../api/coachMonthlyChampions.js";

const BASE = "/coach/monthly-champions";

export function CoachMonthlyChampionsLayout() {
  return <Outlet />;
}

export function CoachMonthlyChampionList() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const onUnauthorized = useCallback(() => dispatch(logoutCoach()), [dispatch]);

  return (
    <PortalMonthlyChampionList
      token={coachToken}
      onUnauthorized={onUnauthorized}
      basePath={BASE}
      listChampions={coachListMonthlyChampions}
    />
  );
}

export function CoachMonthlyChampionView() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const onUnauthorized = useCallback(() => dispatch(logoutCoach()), [dispatch]);

  return (
    <PortalMonthlyChampionView
      token={coachToken}
      onUnauthorized={onUnauthorized}
      basePath={BASE}
      getChampion={coachGetMonthlyChampionById}
    />
  );
}
