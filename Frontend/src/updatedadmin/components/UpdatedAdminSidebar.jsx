import { NavLink } from "react-router-dom";
import { NavIcon } from "./NavIcons.jsx";
import { NAV_ITEMS, UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

export function UpdatedAdminSidebar({ onLogout }) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <NavLink to={UPDATED_ADMIN_PATHS.dashboard} end className="sidebar__brand sidebar__brand-link">
        <div className="sidebar__logo">IR</div>
        <div className="sidebar__brand-text">
          <div className="sidebar__brand-name">India Redefining Wellness</div>
          <div className="sidebar__brand-sub">ADMIN CONSOLE</div>
        </div>
      </NavLink>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.id === "dashboard"}
            className={({ isActive }) =>
              `sidebar__link${isActive ? " sidebar__link--active" : ""}`
            }
          >
            <NavIcon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button type="button" className="sidebar__logout" onClick={onLogout}>
          <NavIcon name="logout" />
          Logout
        </button>
      </div>
    </aside>
  );
}
