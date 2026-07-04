import { useDispatch, useSelector } from "react-redux";
import { logoutAssistant } from "../../../store/authSlice.js";
import { PortalMonthlyChampionsPage } from "../../../components/PortalMonthlyChampionsPage.jsx";
import {
  assistantListMonthlyChampions,
  assistantGetMonthlyChampionById,
} from "../../api/assistantMonthlyChampions.js";

export function AssistantMonthlyChampionsPage() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <PortalMonthlyChampionsPage
      token={assistantToken}
      onUnauthorized={() => dispatch(logoutAssistant())}
      listChampions={assistantListMonthlyChampions}
      getChampionById={assistantGetMonthlyChampionById}
      title="Monthly champions"
    />
  );
}
