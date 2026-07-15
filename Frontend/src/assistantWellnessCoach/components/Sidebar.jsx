import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import { NavIcon } from "../../admin/components/NavIcon.jsx";
import { selectAppDisplayName, selectPanelLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import { logoutAssistant } from "../../store/authSlice.js";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { assistantNavItems } from "../data/navItems.js";
import { confirmAssistantLogout } from "../utils/confirmLogout.js";

export function AssistantSidebar({ id = "assistant-sidebar", onNavigate, drawerOpen, desktopCollapsed }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const brandLogoUrl = useSelector(selectPanelLogoUrl);
  const appDisplayName = useSelector(selectAppDisplayName);
  const logoSrc = mediaUrl(brandLogoUrl) || defaultLogo;

  const handleLogout = async () => {
    const ok = await confirmAssistantLogout();
    if (!ok) return;
    dispatch(logoutAssistant());
    navigate("/assistant/login", { replace: true });
    onNavigate?.();
  };

  return (
    <aside
      id={id}
      className={`admin-sidebar${drawerOpen ? " admin-sidebar--open" : ""}${
        desktopCollapsed ? " admin-sidebar--collapsed" : ""
      }`}
      aria-label="Assistant navigation"
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
          <div className="admin-sidebar__subtitle">Assistant Coach</div>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        {assistantNavItems.map((item) => (
          <NavLink
            key={item.to}
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
