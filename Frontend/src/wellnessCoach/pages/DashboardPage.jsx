import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { AdminMediaImage } from "../../admin/components/AdminMediaImage.jsx";
import { PortalDashboardIntro } from "../../admin/components/PortalProfileLayout.jsx";
import { CoachPageLoader } from "../components/CoachPageLoader.jsx";
import { coachGetAssistantCount, coachListAssistants } from "../api/coachAssistants.js";
import { formatPhone } from "./myAssistants/MyAssistantShared.js";

function DashboardStatCard({ label, value, tone, icon, to, loading }) {
  const card = (
    <div className={`stat-card stat-card--dashboard stat-card--${tone}${to ? " stat-card--link" : ""}`}>
      <div className="stat-card__body">
        <div className="stat-card__label">{label}</div>
        {loading ? (
          <div className="stat-card__loader">
            <CoachPageLoader label="" className="stat-card__loader-inner" />
          </div>
        ) : (
          <div className="stat-card__value">{value}</div>
        )}
      </div>
      <div className="stat-card__icon" aria-hidden="true">
        {icon}
      </div>
    </div>
  );

  if (!to) return card;
  return (
    <Link to={to} className="dashboard-stat-link">
      {card}
    </Link>
  );
}

function ShortcutCard({ to, title, description, icon }) {
  return (
    <Link to={to} className="shortcut-card">
      <div className="shortcut-card__head">
        <span className="shortcut-card__icon">{icon}</span>
        <span className="shortcut-card__arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </div>
      <h3 className="shortcut-card__title">{title}</h3>
      <p className="shortcut-card__desc">{description}</p>
    </Link>
  );
}

function formatLocation(coach) {
  return [coach?.city, coach?.state, coach?.country].filter(Boolean).join(", ");
}

export function CoachDashboardPage() {
  const coachToken = useSelector((s) => s.auth.coachToken);
  const coach = useSelector((s) => s.auth.coach);
  const [assistantCount, setAssistantCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [recentAssistants, setRecentAssistants] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const locationLabel = useMemo(() => formatLocation(coach), [coach]);
  const accountStatus = String(coach?.status || "active").toLowerCase() === "active" ? "Active" : "Inactive";

  useEffect(() => {
    if (!coachToken) return;
    let cancelled = false;

    (async () => {
      setLoadingStats(true);
      try {
        const [total, activeList] = await Promise.all([
          coachGetAssistantCount(coachToken),
          coachListAssistants(coachToken, { page: 1, limit: 1, status: "active" }),
        ]);
        if (!cancelled) {
          setAssistantCount(total ?? 0);
          setActiveCount(activeList?.pagination?.total ?? 0);
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coachToken]);

  useEffect(() => {
    if (!coachToken) return;
    let cancelled = false;

    (async () => {
      setLoadingRecent(true);
      try {
        const { assistants } = await coachListAssistants(coachToken, { page: 1, limit: 5 });
        if (!cancelled) setRecentAssistants(Array.isArray(assistants) ? assistants : []);
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coachToken]);

  return (
    <div className="page-stack coach-dashboard">
      <PortalDashboardIntro
        title="Dashboard"
        subtitle={`Welcome back${coach?.name ? `, ${coach.name}` : ""}! Here is your coach overview.`}
      />

      <section className="coach-dashboard-welcome" aria-label="Coach summary">
        <div className="coach-dashboard-welcome__profile">
          <AdminMediaImage
            path={coach?.profileImage}
            alt=""
            className="coach-dashboard-welcome__avatar"
            width={72}
            height={72}
            round
          />
          <div className="coach-dashboard-welcome__info">
            <h2 className="coach-dashboard-welcome__name">{coach?.name || "Wellness Coach"}</h2>
            <p className="coach-dashboard-welcome__meta">{coach?.email || "—"}</p>
            {locationLabel ? <p className="coach-dashboard-welcome__meta">{locationLabel}</p> : null}
          </div>
        </div>
        <div className="coach-dashboard-welcome__badges">
          <span className={`coach-dashboard-badge coach-dashboard-badge--${accountStatus === "Active" ? "active" : "muted"}`}>
            {accountStatus}
          </span>
          <span className="coach-dashboard-badge coach-dashboard-badge--approved">Approved</span>
        </div>
      </section>

      <section className="coach-dashboard-section" aria-labelledby="coach-overview-heading">
        <h2 id="coach-overview-heading" className="dashboard-section-head__title">
          Overview
        </h2>
        <div className="stat-grid stat-grid--dashboard">
          <DashboardStatCard
            label="Total assistants (AWC)"
            value={assistantCount}
            tone="orange"
            to="/coach/my-assistants"
            loading={loadingStats}
            icon={
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <DashboardStatCard
            label="Active assistants"
            value={activeCount}
            tone="green"
            to="/coach/my-assistants"
            loading={loadingStats}
            icon={
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4 12 14.01l-3-3" />
              </svg>
            }
          />
          <DashboardStatCard
            label="Account status"
            value={accountStatus}
            tone="blue"
            loading={false}
            icon={
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
        </div>
      </section>

      <section className="coach-dashboard-section" aria-labelledby="coach-actions-heading">
        <h2 id="coach-actions-heading" className="dashboard-section-head__title">
          Quick actions
        </h2>
        <div className="shortcut-grid shortcut-grid--coach">
          <ShortcutCard
            to="/coach/my-assistants"
            title="Manage assistants"
            description="View, edit, and manage your assistant wellness coaches."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <ShortcutCard
            to="/coach/my-assistants/new"
            title="Add assistant"
            description="Create a new assistant wellness coach under your account."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            }
          />
          <ShortcutCard
            to="/coach/profile"
            title="My profile"
            description="Update your personal details, photo, and password."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
        </div>
      </section>

      <section className="panel coach-dashboard-panel" aria-labelledby="coach-recent-heading">
        <div className="coach-dashboard-panel__head">
          <div>
            <h2 id="coach-recent-heading" className="panel__title">
              Recent assistants
            </h2>
            <p className="panel__hint">Latest assistant wellness coaches linked to your account.</p>
          </div>
          <Link to="/coach/my-assistants" className="btn btn--ghost btn--sm">
            View all
          </Link>
        </div>

        {loadingRecent ? (
          <div className="coach-dashboard-panel__loader">
            <CoachPageLoader label="Loading assistants..." />
          </div>
        ) : recentAssistants.length === 0 ? (
          <div className="coach-dashboard-empty">
            <p>No assistants yet.</p>
            <Link to="/coach/my-assistants/new" className="btn btn--primary btn--sm">
              Add your first assistant
            </Link>
          </div>
        ) : (
          <ul className="coach-dashboard-recent">
            {recentAssistants.map((row) => {
              const id = String(row.id || row._id || "");
              return (
                <li key={id}>
                  <Link to={`/coach/my-assistants/${id}`} className="coach-dashboard-recent__item">
                    <AdminMediaImage
                      path={row.profileImage}
                      alt=""
                      className="coach-dashboard-recent__avatar"
                      width={40}
                      height={40}
                      round
                    />
                    <div className="coach-dashboard-recent__body">
                      <span className="coach-dashboard-recent__name">{row.name || "—"}</span>
                      <span className="coach-dashboard-recent__meta">
                        {row.email || "—"}
                        {row.phone ? ` · ${formatPhone(row)}` : ""}
                      </span>
                    </div>
                    <span
                      className={`coach-dashboard-badge coach-dashboard-badge--${
                        String(row.status || "active").toLowerCase() === "active" ? "active" : "muted"
                      }`}
                    >
                      {String(row.status || "active").toLowerCase() === "active" ? "Active" : "Inactive"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
