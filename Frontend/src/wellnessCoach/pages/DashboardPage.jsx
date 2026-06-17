import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { coachGetAssistantCount } from "../api/coachAssistants.js";
import { CoachPageLoader } from "../components/CoachPageLoader.jsx";
import { PortalDashboardIntro } from "../../admin/components/PortalProfileLayout.jsx";

function StatCard({ icon, label, value, to, colorClass, loading }) {
  const content = (
    <div className="dashboard-stat-card">
      <div className={`dashboard-stat-card__icon ${colorClass}`}>{icon}</div>
      <div className="dashboard-stat-card__label">{label}</div>
      {loading ? (
        <div className="dashboard-stat-card__loader">
          <CoachPageLoader label="" className="dashboard-stat-card__loader-inner" />
        </div>
      ) : (
        <div className="dashboard-stat-card__value">{value}</div>
      )}
    </div>
  );
  return to ? (
    <Link to={to} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  ) : (
    content
  );
}

export function CoachDashboardPage() {
  const coachToken = useSelector((s) => s.auth.coachToken);
  const coach = useSelector((s) => s.auth.coach);
  const [assistantCount, setAssistantCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);

  useEffect(() => {
    if (!coachToken) return;
    let cancelled = false;
    setLoadingCount(true);
    coachGetAssistantCount(coachToken)
      .then((count) => {
        if (!cancelled) setAssistantCount(count ?? 0);
      })
      .finally(() => {
        if (!cancelled) setLoadingCount(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coachToken]);

  return (
    <div className="page-stack">
      <PortalDashboardIntro
        title="Dashboard"
        subtitle={`Welcome back${coach?.name ? `, ${coach.name}` : ""}! Here is your coach overview.`}
      />

      <div className="dashboard-stats">
        <StatCard
          icon={
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          label="Assistant wellness coaches"
          value={assistantCount}
          loading={loadingCount}
          to="/coach/my-assistants"
          colorClass="dashboard-stat-card__icon--orange"
        />
      </div>
    </div>
  );
}
