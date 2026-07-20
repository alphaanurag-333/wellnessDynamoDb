import { Outlet } from "react-router-dom";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutAssistant } from "../../../store/authSlice.js";
import { PortalMonthlyChampionList } from "../../../components/monthlyChampion/PortalMonthlyChampionList.jsx";
import { PortalMonthlyChampionView } from "../../../components/monthlyChampion/PortalMonthlyChampionView.jsx";
import {
  assistantGetMonthlyChampionById,
  assistantListMonthlyChampions,
} from "../../api/assistantMonthlyChampions.js";

const BASE = "/assistant/monthly-champions";

export function AssistantMonthlyChampionsLayout() {
  return <Outlet />;
}

export function AssistantMonthlyChampionList() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const onUnauthorized = useCallback(() => dispatch(logoutAssistant()), [dispatch]);

  return (
    <PortalMonthlyChampionList
      token={assistantToken}
      onUnauthorized={onUnauthorized}
      basePath={BASE}
      listChampions={assistantListMonthlyChampions}
    />
  );
}

export function AssistantMonthlyChampionView() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const onUnauthorized = useCallback(() => dispatch(logoutAssistant()), [dispatch]);

  return (
    <PortalMonthlyChampionView
      token={assistantToken}
      onUnauthorized={onUnauthorized}
      basePath={BASE}
      getChampion={assistantGetMonthlyChampionById}
    />
  );
}
