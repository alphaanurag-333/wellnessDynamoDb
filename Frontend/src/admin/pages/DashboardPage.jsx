const stats = [
  { label: "Total Users", value: "12,482", tone: "blue" },
  { label: "Active Programs", value: "84", tone: "green" },
  { label: "Coaches (WC) Active", value: "142", tone: "purple" },
  { label: "AWC's Active", value: "38", tone: "indigo" },
  { label: "Pending Approvals", value: "18", tone: "amber" },
  { label: "Revenue & Payouts", value: "$84,290", tone: "teal" },
];

const shortcuts = [
  { title: "User Management", desc: "Manage all platform users", icon: "users" },
  { title: "WC Management", desc: "Manage wellness coaches", icon: "coach" },
  { title: "Role & Permissions", desc: "Access control", icon: "shield" },
  { title: "Pricing Control", desc: "Manage programs & offers", icon: "settings" },
  { title: "Payment Mgmt", desc: "Transactions & payouts", icon: "wallet" },
  { title: "Video Meetings", desc: "Scheduled sessions", icon: "video" },
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
        <path d="M19 7h4M21 5v4" />
      </svg>
    );
  }
  if (type === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        <path d="M9.5 12.5l1.8 1.8 3.2-3.2" />
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
  if (type === "wallet") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <circle cx="16.5" cy="14" r="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="3" y="6" width="15" height="12" rx="2" />
      <path d="M18 10l3-2v8l-3-2z" />
    </svg>
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

      <section className="shortcut-grid" aria-label="Quick shortcuts">
        {shortcuts.map((item) => (
          <article key={item.title} className="shortcut-card">
            <div className="shortcut-card__head">
              <span className="shortcut-card__icon">
                <ShortcutIcon type={item.icon} />
              </span>
              <span className="shortcut-card__arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                  <path d="m13 5 7 7-7 7" />
                </svg>
              </span>
            </div>
            <h3 className="shortcut-card__title">{item.title}</h3>
            <p className="shortcut-card__desc">{item.desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
