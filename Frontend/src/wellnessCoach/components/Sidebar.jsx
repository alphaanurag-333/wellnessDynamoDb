import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import { NavIcon } from "../../admin/components/NavIcon.jsx";
import { selectAppDisplayName, selectPanelLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import { logoutCoach } from "../../store/authSlice.js";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { coachNavItems } from "../data/navItems.js";
import { navPermissionKey } from "../data/coachPermissionKeys.js";
import { useHasPermission } from "../hooks/useHasPermission.jsx";
import { confirmCoachLogout } from "../utils/confirmLogout.js";
import { LOCK_TOOLTIP } from "./AccessRestrictedView.jsx";

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="admin-sidebar__lock-icon"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CoachNavItem({ item, onNavigate }) {
  const allowed = useHasPermission(navPermissionKey(item.to));

  if (!allowed) {
    return (
      <span
        className="admin-sidebar__link admin-sidebar__link--locked"
        title={LOCK_TOOLTIP}
        aria-disabled="true"
        onClick={(e) => e.preventDefault()}
        style={{ opacity: 0.45, cursor: "not-allowed", pointerEvents: "auto" }}
      >
        <NavIcon name={item.icon} />
        <span className="admin-sidebar__link-text">{item.label}</span>
        <LockIcon />
      </span>
    );
  }

  return (
    <NavLink
      to={item.to}
      title={item.label}
      className={({ isActive }) =>
        `admin-sidebar__link${isActive ? " admin-sidebar__link--active" : ""}`
      }
      onClick={onNavigate}
    >
      <NavIcon name={item.icon} />
      <span className="admin-sidebar__link-text">{item.label}</span>
    </NavLink>
  );
}

export function CoachSidebar({ id = "coach-sidebar", onNavigate, drawerOpen, desktopCollapsed }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const brandLogoUrl = useSelector(selectPanelLogoUrl);
  const appDisplayName = useSelector(selectAppDisplayName);
  const logoSrc = mediaUrl(brandLogoUrl) || defaultLogo;

  const handleLogout = async () => {
    const ok = await confirmCoachLogout();
    if (!ok) return;
    dispatch(logoutCoach());
    navigate("/coach/login", { replace: true });
    onNavigate?.();
  };

  return (
    <aside
      id={id}
      className={`admin-sidebar${drawerOpen ? " admin-sidebar--open" : ""}${
        desktopCollapsed ? " admin-sidebar--collapsed" : ""
      }`}
      aria-label="Coach navigation"
    >
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__logo" aria-hidden="true">
          <img
            src={logoSrc}
            alt=""
            className="admin-sidebar__logo-img"
            width={36}
            height={36}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = defaultLogo;
            }}
          />
        </span>
        <div className="admin-sidebar__brand-text">
          <div className="admin-sidebar__title">{appDisplayName || "Wellness"}</div>
          <div className="admin-sidebar__subtitle">Wellness Coach</div>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        {coachNavItems.map((item) => (
          <CoachNavItem key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <button type="button" className="admin-sidebar__logout" title="Logout" onClick={handleLogout}>
          <NavIcon name="logout" />
          <span className="admin-sidebar__logout-text">Logout</span>
        </button>
      </div>
    </aside>
  );
}
