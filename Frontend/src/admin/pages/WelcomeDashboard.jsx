import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { NavIcon } from "../components/NavIcon.jsx";
import { navItems } from "../data/navItems.js";
import { selectAdmin, selectIsSuperAdmin, selectPermissions } from "../../store/authSelectors.js";
import { filterNavItemsByPermission } from "../utils/navAccess.js";

function collectAccessibleLinks(auth) {
  const visible = filterNavItemsByPermission(navItems, auth);
  const links = [];
  for (const item of visible) {
    if (item.to === "dashboard" || item.to === "profile") continue;
    if (Array.isArray(item.children)) {
      for (const child of item.children) {
        links.push({
          to: `/admin/${child.to}`,
          label: child.label,
          icon: child.icon || item.icon || "grid",
          group: item.label,
        });
      }
    } else if (item.to) {
      links.push({
        to: `/admin/${item.to}`,
        label: item.label,
        icon: item.icon || "grid",
        group: null,
      });
    }
  }
  return links;
}

function WelcomeShortcut({ to, label, icon, group }) {
  return (
    <Link to={to} className="admin-welcome__link">
      <span className="admin-welcome__link-icon" aria-hidden="true">
        <NavIcon name={icon} />
      </span>
      <span className="admin-welcome__link-text">
        {group ? <span className="admin-welcome__link-group">{group}</span> : null}
        <span className="admin-welcome__link-label">{label}</span>
      </span>
      <span className="admin-welcome__link-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
    </Link>
  );
}

/** Shown when an admin can open /admin/dashboard but lacks dashboard.view (no stats). */
export function WelcomeDashboard() {
  const admin = useSelector(selectAdmin);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const permissions = useSelector(selectPermissions);

  const displayName = String(admin?.name || "").trim() || "there";
  const links = collectAccessibleLinks({ isSuperAdmin, permissions });

  return (
    <div className="page-stack admin-welcome-dashboard">
      <section className="admin-welcome" aria-label="Welcome">
        <div className="admin-welcome__hero">
          <div className="admin-welcome__hero-mark" aria-hidden="true">
            <NavIcon name="grid" />
          </div>
          <p className="admin-welcome__eyebrow">IR Wellness Admin</p>
          <h1 className="admin-welcome__title">Welcome, {displayName}</h1>
          <p className="admin-welcome__subtitle">
            You&apos;re signed in to the admin panel. Platform analytics aren&apos;t included in your
            role — use the sidebar or the shortcuts below to open the modules you can manage.
          </p>
        </div>

        <div className="admin-welcome__panels">
          <article className="admin-welcome__card admin-welcome__card--tips">
            <h2 className="admin-welcome__card-title">Getting started</h2>
            <ul className="admin-welcome__tips">
              <li>Open assigned modules from the left sidebar.</li>
              <li>Update your profile anytime from the header menu.</li>
              <li>Need more access? Ask a Super Admin to update your role.</li>
            </ul>
          </article>

          <article className="admin-welcome__card admin-welcome__card--access">
            <h2 className="admin-welcome__card-title">Your access</h2>
            <p className="admin-welcome__access-count">
              {links.length === 0
                ? "No modules are assigned to your role yet."
                : `You can access ${links.length} module${links.length === 1 ? "" : "s"}.`}
            </p>
          </article>
        </div>

        <section className="admin-welcome__shortcuts" aria-label="Your modules">
          <h2 className="dashboard-section-head__title">Your modules</h2>
          {links.length === 0 ? (
            <div className="admin-welcome__empty" role="status">
              <p>
                Your role doesn&apos;t include module permissions yet. Contact a Super Admin to assign
                the areas you should manage.
              </p>
              <Link to="/admin/profile" className="btn btn--primary">
                Go to profile
              </Link>
            </div>
          ) : (
            <div className="admin-welcome__link-grid">
              {links.map((link) => (
                <WelcomeShortcut key={link.to} {...link} />
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
