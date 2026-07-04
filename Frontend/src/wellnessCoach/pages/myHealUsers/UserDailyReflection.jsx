import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserDailyReflectionPanel } from "../../../components/UserDailyReflectionPanel.jsx";
import { DailyReflectionScoreGraph } from "../../../components/DailyReflectionScoreGraph.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachGetDailyReflectionSettings,
  coachUpdateDailyReflectionSettings,
  coachGetDailyReflectionHistory,
} from "../../api/coachDailyReflection.js";

const dailyReflectionApi = {
  getSettings: coachGetDailyReflectionSettings,
  updateSettings: coachUpdateDailyReflectionSettings,
};

const TABS = [
  { id: "graph", label: "Score Graph" },
  { id: "settings", label: "Settings" },
];

export function UserDailyReflection({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);
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
          token={coachToken}
          userId={userId}
          fetchHistory={coachGetDailyReflectionHistory}
          onUnauthorized={() => dispatch(logoutCoach())}
        />
      ) : (
        <UserDailyReflectionPanel
          token={coachToken}
          userId={userId}
          api={dailyReflectionApi}
          onUnauthorized={() => dispatch(logoutCoach())}
        />
      )}
    </div>
  );
}
