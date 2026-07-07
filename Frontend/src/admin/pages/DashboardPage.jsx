import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AdminDashboardCharts } from "../components/AdminDashboardCharts.jsx";
import { DashboardChartsSkeleton, DashboardStatsSkeleton } from "../components/AdminDashboardSkeleton.jsx";
import { adminGetDashboardStatistics } from "../api/adminDashboard.js";
import { logout } from "../../store/authSlice.js";

const shortcuts = [
  { title: "User Management", desc: "Manage all platform users", icon: "users", to: "/admin/users" },
  { title: "WC Management", desc: "Manage wellness coaches", icon: "coach", to: "/admin/coaches" },
  { title: "AWC Management", desc: "Manage assistant coaches", icon: "assistant", to: "/admin/awcs" },
  { title: "Contact Queries", desc: "View and respond to inquiries", icon: "mail", to: "/admin/contact-inquiries" },
  { title: "Application Settings", desc: "Configure app settings", icon: "settings", to: "/admin/settings" },
];

const STAT_CARDS = [
  {
    key: "totalUsers",
    label: "Total Users",
    tone: "blue",
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
    key: "activePrograms",
    label: "Active Wellness Programs",
    tone: "green",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: "activeWellnessCoaches",
    label: "Coaches (WC) Active",
    tone: "purple",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
  {
    key: "activeAssistants",
    label: "AWC's Active",
    tone: "indigo",
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
    key: "pendingCoachApprovals",
    label: "Pending WC signups",
    description: "Wellness coach accounts awaiting admin approval",
    tone: "amber",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" />
        <path d="M12 12v4" />
        <path d="M10 16h4" />
      </svg>
    ),
  },
  {
    key: "pendingUserAssignments",
    label: "Pending user assignments",
    description: "Heal & consultancy users awaiting coach assignment",
    tone: "orange",
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
    key: "revenueAndPayouts",
    label: "Revenue & Payouts",
    tone: "teal",
    format: "revenue",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 15h2" />
      </svg>
    ),
  },
];

function formatCount(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat().format(Number(value));
}

function formatRevenue(amount, currency = "INR") {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  if (currency === "INR") {
    return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(amount))}`;
  }
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount));
}

function formatStatValue(card, statistics) {
  if (!statistics) return "—";
  const raw = statistics[card.key];
  if (card.format === "revenue") {
    return formatRevenue(raw, statistics.currency);
  }
  return formatCount(raw);
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
  if (type === "coach") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }
  if (type === "assistant") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <circle cx="9" cy="7" r="3" />
        <path d="M2 21a7 7 0 0 1 14 0" />
        <path d="M19 8v6" />
        <path d="M16 11h6" />
      </svg>
    );
  }
  if (type === "mail") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 6-10 7L2 6" />
      </svg>
    );
  }
  if (type === "settings") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 1-3 0 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 1 0-3 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 1 3 0 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.25.33.46.68.6 1a1.7 1.7 0 0 1 0 3 1.7 1.7 0 0 0-.6 1z" />
      </svg>
    );
  }
  return null;
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

function DashboardStatCard({ label, value, description, tone, icon }) {
  return (
    <article className={`stat-card stat-card--dashboard stat-card--${tone}`}>
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
}

export function DashboardPage() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadStatistics = useCallback(async () => {
    if (!adminToken) {
      setLoading(false);
      return;
    }
    setLoadError("");
    setLoading(true);
    try {
      const stats = await adminGetDashboardStatistics(adminToken);
      setStatistics(stats);
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
      else setLoadError(e.message || "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const statValues = useMemo(
    () =>
      STAT_CARDS.map((card) => ({
        ...card,
        value: formatStatValue(card, statistics),
      })),
    [statistics]
  );

  return (
    <div className="page-stack admin-dashboard">
      <section className="dashboard-intro admin-dashboard__intro" aria-label="Dashboard heading">
        <div>
          <h1 className="dashboard-intro__title">Dashboard</h1>
          <p className="dashboard-intro__subtitle">Welcome back! Here&apos;s a quick overview of your platform.</p>
        </div>
        <button type="button" className="btn btn--ghost admin-dashboard__refresh" onClick={loadStatistics} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
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
              />
            ))
          )}
        </div>
      </section>

      <section className="admin-dashboard__section" aria-label="Analytics charts" aria-busy={loading}>
        <h2 className="dashboard-section-head__title">Analytics</h2>
        {loading ? (
          <DashboardChartsSkeleton />
        ) : (
          <AdminDashboardCharts charts={statistics?.charts} currency={statistics?.currency} />
        )}
      </section>

      <section className="admin-dashboard__section" aria-label="Quick shortcuts">
        <h2 className="dashboard-section-head__title">Quick Shortcuts</h2>
        <div className="shortcut-grid shortcut-grid--dashboard">
          {shortcuts.map((item) => (
            <ShortcutCard key={item.to} to={item.to} title={item.title} desc={item.desc} icon={item.icon} />
          ))}
        </div>
      </section>
    </div>
  );
}
