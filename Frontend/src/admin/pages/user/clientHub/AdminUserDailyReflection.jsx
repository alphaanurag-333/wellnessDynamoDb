import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserDailyReflectionPanel } from "../../../../components/UserDailyReflectionPanel.jsx";
import { DailyReflectionScoreGraph } from "../../../../components/DailyReflectionScoreGraph.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminGetDailyReflectionSettings,
  adminGetDailyReflectionHistory,
} from "../../../api/adminHealDailyReflection.js";

const dailyReflectionApi = {
  getSettings: adminGetDailyReflectionSettings,
};

const TABS = [
  { id: "graph", label: "Score Graph" },
  { id: "settings", label: "Settings" },
];

export function AdminUserDailyReflection({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);
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
          token={adminToken}
          userId={userId}
          fetchHistory={adminGetDailyReflectionHistory}
          onUnauthorized={() => dispatch(logout())}
        />
      ) : (
        <UserDailyReflectionPanel
          token={adminToken}
          userId={userId}
          api={dailyReflectionApi}
          readOnly
          onUnauthorized={() => dispatch(logout())}
        />
      )}
    </div>
  );
}
