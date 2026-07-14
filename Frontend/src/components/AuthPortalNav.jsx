import { Link } from "react-router-dom";

const PORTALS = [
  { id: "admin", to: "/admin/login", label: "Admin", shortLabel: "Admin" },
  { id: "coach", to: "/coach/login", label: "Wellness Coach", shortLabel: "Coach" },
  {
    id: "assistant",
    to: "/assistant/login",
    label: "Assistant Coach",
    shortLabel: "Assistant",
  },
];

/** Segmented links between Admin / Wellness Coach / Assistant login portals. */
export function AuthPortalNav({ active }) {
  return (
    <nav className="auth-portal-nav" aria-label="Choose portal">
      <p className="auth-portal-nav__hint">Sign in as</p>
      <div className="auth-portal-nav__tabs" role="tablist" aria-label="Login portal">
        {PORTALS.map((portal) => {
          const isActive = portal.id === active;
          return (
            <Link
              key={portal.id}
              to={portal.to}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={`auth-portal-nav__tab${isActive ? " auth-portal-nav__tab--active" : ""}`}
            >
              <span className="auth-portal-nav__tab-full">{portal.label}</span>
              <span className="auth-portal-nav__tab-short">{portal.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
