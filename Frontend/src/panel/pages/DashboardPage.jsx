import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { NavIcon } from "../../admin/components/NavIcon.jsx";
import { selectIsStaffSuperAdmin, selectStaffAccount } from "../../store/staffAuthSelectors.js";

const ACCOUNT_TYPE_LABELS = {
  admin: "Admin",
  wellness_coach: "Wellness Coach",
  assistant_wellness_coach: "Assistant Wellness Coach",
};

export function DashboardPage() {
  const staffAccount = useSelector(selectStaffAccount);
  const isSuperAdmin = useSelector(selectIsStaffSuperAdmin);
  const accountTypeLabel = ACCOUNT_TYPE_LABELS[staffAccount?.accountType] || "Staff";
  const displayName = String(staffAccount?.name || "").trim() || "there";

  return (
    <div className="page-stack admin-welcome-dashboard">
      <section className="admin-welcome" aria-label="Welcome">
        <div className="admin-welcome__hero">
          <div className="admin-welcome__hero-mark" aria-hidden="true">
            <NavIcon name="shield" />
          </div>
          <p className="admin-welcome__eyebrow">Unified Staff Panel</p>
          <h1 className="admin-welcome__title">Welcome, {displayName}</h1>
          <p className="admin-welcome__subtitle">
            {isSuperAdmin ? "Super Admin" : accountTypeLabel} · Admin, Wellness Coach and Assistant
            Wellness Coach now share one login, one role &amp; permission system.
          </p>
        </div>

        <section className="admin-welcome__shortcuts" aria-label="Panel modules">
          <h2 className="dashboard-section-head__title">Panel modules</h2>
          <div className="admin-welcome__link-grid">
            {isSuperAdmin ? (
              <Link to="/panel/staff-accounts" className="admin-welcome__link">
                <span className="admin-welcome__link-icon" aria-hidden="true">
                  <NavIcon name="users" />
                </span>
                <span className="admin-welcome__link-text">
                  <span className="admin-welcome__link-label">Staff Accounts</span>
                </span>
                <span className="admin-welcome__link-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </span>
              </Link>
            ) : null}
            {isSuperAdmin ? (
              <Link to="/panel/roles" className="admin-welcome__link">
                <span className="admin-welcome__link-icon" aria-hidden="true">
                  <NavIcon name="clipboard-list" />
                </span>
                <span className="admin-welcome__link-text">
                  <span className="admin-welcome__link-label">Roles &amp; Permissions</span>
                </span>
                <span className="admin-welcome__link-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </span>
              </Link>
            ) : null}
            <Link to="/panel/profile" className="admin-welcome__link">
              <span className="admin-welcome__link-icon" aria-hidden="true">
                <NavIcon name="profile" />
              </span>
              <span className="admin-welcome__link-text">
                <span className="admin-welcome__link-label">My Profile</span>
              </span>
              <span className="admin-welcome__link-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </Link>
          </div>
        </section>

        <div className="admin-welcome__panels">
          <article className="admin-welcome__card admin-welcome__card--tips">
            <h2 className="admin-welcome__card-title">About the Staff Panel</h2>
            <p className="user-page__subtitle">
              This unified panel is rolling out incrementally. Day-to-day feature pages (users,
              catalogs, client hub, etc.) are being migrated over in stages — until then, continue
              using the classic{" "}
              <a href="/admin/dashboard">Admin</a>, <a href="/coach/dashboard">Coach</a> or{" "}
              <a href="/assistant/dashboard">Assistant</a> portal for those.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
