import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserDailyReflectionPanel } from "../../../components/UserDailyReflectionPanel.jsx";
import { DailyReflectionScoreGraph } from "../../../components/DailyReflectionScoreGraph.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantGetDailyReflectionSettings,
  assistantGetDailyReflectionHistory,
} from "../../api/assistantDailyReflection.js";

const dailyReflectionApi = {
  getSettings: assistantGetDailyReflectionSettings,
};

const TABS = [
  { id: "graph", label: "Score Graph" },
  { id: "settings", label: "Settings" },
];

export function AssistantUserDailyReflection({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const [tab, setTab] = useState("graph");

  if (!embedded) {
    return null;
  }

  return (
    <div className="user-daily-reflection-page">
      <div className="settings-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`settings-tabs__tab${tab === t.id ? " settings-tabs__tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "graph" ? (
        <DailyReflectionScoreGraph
          token={assistantToken}
          userId={userId}
          fetchHistory={assistantGetDailyReflectionHistory}
          onUnauthorized={() => dispatch(logoutAssistant())}
        />
      ) : (
        <UserDailyReflectionPanel
          token={assistantToken}
          userId={userId}
          api={dailyReflectionApi}
          readOnly
          onUnauthorized={() => dispatch(logoutAssistant())}
        />
      )}
    </div>
  );
}
