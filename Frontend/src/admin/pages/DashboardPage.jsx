import { Link } from "react-router-dom";

const stats = [
  { label: "Total Users", value: "12,482", tone: "blue" },
  { label: "Active Programs", value: "84", tone: "green" },
  { label: "Coaches (WC) Active", value: "142", tone: "purple" },
  { label: "AWC's Active", value: "38", tone: "indigo" },
  { label: "Pending Approvals", value: "18", tone: "amber" },
  { label: "Revenue & Payouts", value: "$84,290", tone: "teal" },
];

const shortcuts = [
  { title: "User Management", desc: "Manage all platform users", icon: "users", to: "/admin/users" },
  { title: "WC Management", desc: "Manage wellness coaches", icon: "coach", to: "/admin/coaches" },
  { title: "AWC Management", desc: "Manage assistant coaches", icon: "assistant", to: "/admin/awcs" },
  { title: "Contact Queries", desc: "View and respond to inquiries", icon: "mail", to: "/admin/contact-inquiries" },
  { title: "Application Settings", desc: "Configure app settings", icon: "settings", to: "/admin/settings" },
];

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

export function DashboardPage() {
  return (
    <div className="page-stack">
      <section className="dashboard-intro" aria-label="Dashboard heading">
        <h1 className="dashboard-intro__title">Dashboard</h1>
        <p className="dashboard-intro__subtitle">Welcome back! Here&apos;s a quick overview of your platform.</p>
      </section>

      <section className="dashboard-section-head" aria-label="Quick insights heading">
        <h2 className="dashboard-section-head__title">Quick Insights</h2>
      </section>

      <section className="stat-grid stat-grid--dashboard" aria-label="Quick insights">
        {stats.map((s) => (
          <article key={s.label} className={`stat-card stat-card--dashboard stat-card--${s.tone}`}>
            <div className="stat-card__icon" aria-hidden="true" />
            <div className="stat-card__meta">
              <div className="stat-card__label">{s.label}</div>
              <div className="stat-card__value">{s.value}</div>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-section-head" aria-label="Quick shortcuts heading">
        <h2 className="dashboard-section-head__title">Quick Shortcuts</h2>
      </section>

      <section className="shortcut-grid shortcut-grid--dashboard" aria-label="Quick shortcuts">
        {shortcuts.map((item) => (
          <ShortcutCard key={item.to} to={item.to} title={item.title} desc={item.desc} icon={item.icon} />
        ))}
      </section>
    </div>
  );
}
