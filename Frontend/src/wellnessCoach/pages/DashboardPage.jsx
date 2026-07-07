import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AdminMediaImage, resolveMediaImageSrc } from "../../admin/components/AdminMediaImage.jsx";
import {
  DashboardChartsSkeleton,
  DashboardStatsSkeleton,
} from "../../admin/components/AdminDashboardSkeleton.jsx";
import { CoachDashboardCharts } from "../components/CoachDashboardCharts.jsx";
import { CoachPageLoader } from "../components/CoachPageLoader.jsx";
import { coachGetDashboardStatistics } from "../api/coachDashboard.js";
import { logoutCoach } from "../../store/authSlice.js";
import { formatPhone } from "./myAssistants/MyAssistantShared.js";

const STAT_CARDS = [
  {
    key: "totalClients",
    label: "Assigned clients",
    tone: "blue",
    to: "/coach/my-users",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "healClients",
    label: "Heal clients",
    tone: "green",
    to: "/coach/my-users",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4 12 14.01l-3-3" />
      </svg>
    ),
  },
  {
    key: "totalAssistants",
    label: "Total assistants",
    tone: "purple",
    to: "/coach/my-assistants",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "activeAssistants",
    label: "Active assistants",
    tone: "indigo",
    to: "/coach/my-assistants",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0" />
        <path d="M19 8v6" />
        <path d="M16 11h6" />
      </svg>
    ),
  },
  {
    key: "pendingMealApprovals",
    label: "Pending meal logs",
    description: "Client meal entries awaiting your review",
    tone: "orange",
    to: "/coach/meal-approvals",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 11h18" />
        <path d="M12 3v18" />
      </svg>
    ),
  },
  {
    key: "pendingTestimonials",
    label: "Pending testimonials",
    description: "Client success stories awaiting approval",
    tone: "purple",
    to: "/coach/real-people-testimonials",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: "pendingCommitmentLetters",
    label: "Pending commitment letters",
    description: "Signed letters awaiting your review",
    tone: "indigo",
    to: "/coach/commitment-letters",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    ),
  },
];

const shortcuts = [
  { title: "My clients", desc: "View and manage assigned clients", icon: "users", to: "/coach/my-users" },
  { title: "Manage assistants", desc: "View and manage assistant coaches", icon: "assistants", to: "/coach/my-assistants" },
  { title: "Meal approvals", desc: "Review pending meal logs", icon: "meals", to: "/coach/meal-approvals" },
  { title: "Testimonials", desc: "Approve client success stories", icon: "testimonials", to: "/coach/real-people-testimonials" },
  { title: "Commitment letters", desc: "Review signed commitment letters", icon: "letters", to: "/coach/commitment-letters" },
  { title: "My profile", desc: "Update your coach profile", icon: "profile", to: "/coach/profile" },
];

function formatCount(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat().format(Number(value));
}

function formatTierLabel(tier) {
  const next = String(tier || "").toLowerCase();
  if (next === "heal") return "Heal";
  if (next === "consultancy_only") return "Consultancy";
  return tier || "—";
}

function formatLocation(profile) {
  return [profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ");
}

function profileImageProps(profile) {
  const image = profile?.profileImage;
  const resolved = resolveMediaImageSrc(image);
  if (/^https?:\/\//i.test(resolved)) {
    return { src: resolved };
  }
  return { path: image };
}

function ShortcutIcon({ type }) {
  if (type === "users") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a3 3 0 0 1 0 5.75" />
      </svg>
    );
  }
  if (type === "assistants") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a3 3 0 0 1 0 5.75" />
      </svg>
    );
  }
  if (type === "meals") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M3 11h18" />
        <path d="M12 3v18" />
      </svg>
    );
  }
  if (type === "testimonials") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  if (type === "letters") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    );
  }
  if (type === "profile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }
  return null;
}

function DashboardStatCard({ label, value, description, tone, icon, to }) {
  const card = (
    <article className={`stat-card stat-card--dashboard stat-card--${tone}${to ? " stat-card--link" : ""}`}>
      <div className="stat-card__body">
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
        {description ? <p className="stat-card__desc">{description}</p> : null}
      </div>
      <div className="stat-card__icon" aria-hidden="true">
        {icon}
      </div>
    </article>
  );

  if (!to) return card;
  return (
    <Link to={to} className="dashboard-stat-link">
      {card}
    </Link>
  );
}

function ShortcutCard({ to, title, desc, icon }) {
  return (
    <Link to={to} className="shortcut-card">
      <div className="shortcut-card__head">
        <span className="shortcut-card__icon">
          <ShortcutIcon type={icon} />
        </span>
        <span className="shortcut-card__arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </div>
      <h3 className="shortcut-card__title">{title}</h3>
      <p className="shortcut-card__desc">{desc}</p>
    </Link>
  );
}

export function CoachDashboardPage() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const coach = useSelector((s) => s.auth.coach);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadStatistics = useCallback(async () => {
    if (!coachToken) {
      setLoading(false);
      return;
    }
    setLoadError("");
    setLoading(true);
    try {
      const stats = await coachGetDashboardStatistics(coachToken);
      setStatistics(stats);
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
      else setLoadError(e.message || "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  }, [coachToken, dispatch]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const statValues = useMemo(
    () =>
      STAT_CARDS.map((card) => ({
        ...card,
        value: formatCount(statistics?.[card.key]),
      })),
    [statistics]
  );

  const profile = statistics?.coach || coach;
  const accountStatus = String(profile?.status || "active").toLowerCase() === "active" ? "Active" : "Inactive";
  const locationLabel = formatLocation(profile);
  const recentClients = (statistics?.recentClients ?? []).slice(0, 5);
  const recentAssistants = (statistics?.recentAssistants ?? []).slice(0, 5);
  const avatarProps = profileImageProps(profile);

  return (
    <div className="page-stack admin-dashboard coach-dashboard">
      <section className="dashboard-intro admin-dashboard__intro" aria-label="Dashboard heading">
        <div>
          <h1 className="dashboard-intro__title">Dashboard</h1>
          <p className="dashboard-intro__subtitle">
            Welcome back{profile?.name ? `, ${profile.name}` : ""}! Here is your coach overview.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost admin-dashboard__refresh"
          onClick={loadStatistics}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </section>

      <section className="coach-dashboard-welcome" aria-label="Coach summary">
        <div className="coach-dashboard-welcome__profile">
          <AdminMediaImage
            {...avatarProps}
            alt=""
            className="coach-dashboard-welcome__avatar"
            width={72}
            height={72}
            round
          />
          <div className="coach-dashboard-welcome__info">
            <h2 className="coach-dashboard-welcome__name">{profile?.name || "Wellness Coach"}</h2>
            <p className="coach-dashboard-welcome__meta">{profile?.email || "—"}</p>
            {locationLabel ? <p className="coach-dashboard-welcome__meta">{locationLabel}</p> : null}
          </div>
        </div>
        <div className="coach-dashboard-welcome__badges">
          <span
            className={`coach-dashboard-badge coach-dashboard-badge--${
              accountStatus === "Active" ? "active" : "muted"
            }`}
          >
            {accountStatus}
          </span>
          <span className="coach-dashboard-badge coach-dashboard-badge--approved">Approved</span>
        </div>
      </section>

      {loadError ? (
        <p className="user-list-error" role="alert">
          {loadError}{" "}
          <button type="button" className="btn btn--ghost btn--sm" onClick={loadStatistics}>
            Retry
          </button>
        </p>
      ) : null}

      <section className="admin-dashboard__section" aria-label="Quick insights" aria-busy={loading}>
        <h2 className="dashboard-section-head__title">Quick Insights</h2>
        <div className="stat-grid stat-grid--dashboard stat-grid--dashboard-7 admin-dashboard__stats">
          {loading ? (
            <DashboardStatsSkeleton count={7} />
          ) : (
            statValues.map((card) => (
              <DashboardStatCard
                key={card.key}
                label={card.label}
                value={card.value}
                description={card.description}
                tone={card.tone}
                icon={card.icon}
                to={card.to}
              />
            ))
          )}
        </div>
      </section>

      <section className="admin-dashboard__section" aria-label="Analytics charts" aria-busy={loading}>
        <h2 className="dashboard-section-head__title">Analytics</h2>
        {loading ? <DashboardChartsSkeleton /> : <CoachDashboardCharts charts={statistics?.charts} />}
      </section>

      <section className="admin-dashboard__section" aria-label="Quick shortcuts">
        <h2 className="dashboard-section-head__title">Quick Shortcuts</h2>
        <div className="shortcut-grid shortcut-grid--dashboard">
          {shortcuts.map((item) => (
            <ShortcutCard key={item.to} to={item.to} title={item.title} desc={item.desc} icon={item.icon} />
          ))}
        </div>
      </section>

      <section className="panel coach-dashboard-panel" aria-labelledby="coach-recent-assistants-heading">
        <div className="coach-dashboard-panel__head">
          <div>
            <h2 id="coach-recent-assistants-heading" className="panel__title">
              Recent assistants
            </h2>
            <p className="panel__hint">Latest assistant wellness coaches linked to your account.</p>
          </div>
          <Link to="/coach/my-assistants" className="btn btn--ghost btn--sm">
            View all
          </Link>
        </div>

        {loading ? (
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
                      {...profileImageProps(row)}
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

      <section className="panel coach-dashboard-panel" aria-labelledby="coach-recent-clients-heading">
        <div className="coach-dashboard-panel__head">
          <div>
            <h2 id="coach-recent-clients-heading" className="panel__title">
              Recent clients
            </h2>
            <p className="panel__hint">Latest clients in your coaching hierarchy.</p>
          </div>
          <Link to="/coach/my-users" className="btn btn--ghost btn--sm">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="coach-dashboard-panel__loader">
            <CoachPageLoader label="Loading clients..." />
          </div>
        ) : recentClients.length === 0 ? (
          <div className="coach-dashboard-empty">
            <p>No clients assigned yet.</p>
            <Link to="/coach/my-users" className="btn btn--primary btn--sm">
              View clients
            </Link>
          </div>
        ) : (
          <ul className="coach-dashboard-recent">
            {recentClients.map((row) => {
              const id = String(row.id || row._id || "");
              return (
                <li key={id}>
                  <Link to={`/coach/my-users/${id}`} className="coach-dashboard-recent__item">
                    <AdminMediaImage
                      {...profileImageProps(row)}
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
                        {row.userTier ? ` · ${formatTierLabel(row.userTier)}` : ""}
                      </span>
                    </div>
                    <span className="coach-dashboard-badge coach-dashboard-badge--active">
                      {formatTierLabel(row.userTier)}
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
