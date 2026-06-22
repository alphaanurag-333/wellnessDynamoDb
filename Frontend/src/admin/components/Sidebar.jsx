import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { navItems } from "../data/navItems.js";
import { selectAppDisplayName, selectPanelLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import { logout } from "../../store/authSlice.js";
import { confirmLogout } from "../utils/confirmLogout.js";
import { NavIcon } from "./NavIcon.jsx";
import defaultLogo from "../../assets/logo/defaultlogo.png";

const NAV_GROUP_PATTERNS = {
  consultancy: /\/admin\/consultancy(\/|$)/,
  program: /\/admin\/(programs|coaches|awcs)(\/|$)/,
  wellness: /\/admin\/(nutrition-plans|support-tickets|camp-events|program-completions)(\/|$)/,
  content: /\/admin\/(banners|celebration-banners|notifications|faq|static-pages)(\/|$)/,
  health: /\/admin\/(health-concerns|health-tools|health-recipes|health-disorders|yoga)(\/|$)/,
  testimonials: /\/admin\/(transformations|client-testimonials|video-testimonials)(\/|$)/,
};

function normalizePath(pathname) {
  return pathname.replace(/\/$/, "") || "/";
}

function pathInGroup(pathname, groupId) {
  return Boolean(NAV_GROUP_PATTERNS[groupId]?.test(pathname));
}

function childPathActive(pathname, segment) {
  const base = `/admin/${segment}`;
  const p = normalizePath(pathname);
  return p === base || p.startsWith(`${base}/`);
}

function isTopLevelNavActive(pathname, segment) {
  const p = normalizePath(pathname);
  const base = `/admin/${segment}`;
  return p === base || p.startsWith(`${base}/`);
}

export function Sidebar({ id = "admin-sidebar", onNavigate, drawerOpen, desktopCollapsed }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const brandLogoUrl = useSelector(selectPanelLogoUrl);
  const appDisplayName = useSelector(selectAppDisplayName);
  const logoSrc = mediaUrl(brandLogoUrl) || defaultLogo;

  const initialOpen = useMemo(() => {
    const open = {};
    for (const id of Object.keys(NAV_GROUP_PATTERNS)) {
      open[id] = pathInGroup(location.pathname, id);
    }
    return open;
  }, [location.pathname]);

  const [openGroups, setOpenGroups] = useState(() => ({ ...initialOpen }));

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(NAV_GROUP_PATTERNS)) {
        if (initialOpen[id] && !prev[id]) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [initialOpen]);

  const handleLogout = async () => {
    const ok = await confirmLogout();
    if (!ok) return;
    dispatch(logout());
    navigate("/admin/login", { replace: true });
    onNavigate?.();
  };

  return (
    <aside
      id={id}
      className={`admin-sidebar${drawerOpen ? " admin-sidebar--open" : ""}${
        desktopCollapsed ? " admin-sidebar--collapsed" : ""
      }`}
      aria-label="Main navigation"
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
          <div className="admin-sidebar__subtitle">Admin</div>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        {navItems.map((item) =>
          Array.isArray(item.children) && item.id ? (
            <div key={item.id} className="admin-sidebar__group">
              <button
                type="button"
                className={`admin-sidebar__link admin-sidebar__group-btn${
                  item.children.some((c) => childPathActive(location.pathname, c.to))
                    ? " admin-sidebar__group-btn--ancestor"
                    : ""
                }`}
                onClick={() => setOpenGroups((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                title={item.label}
                aria-expanded={Boolean(openGroups[item.id])}
              >
                <NavIcon name={item.icon} />
                <span className="admin-sidebar__link-text">{item.label}</span>
                <span
                  className={`admin-sidebar__chevron${openGroups[item.id] ? " is-open" : ""}`}
                  aria-hidden
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </button>
              {openGroups[item.id] ? (
                <div className="admin-sidebar__children">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      title={child.label}
                      className={() =>
                        `admin-sidebar__link admin-sidebar__link--child${
                          childPathActive(location.pathname, child.to) ? " admin-sidebar__link--active" : ""
                        }`
                      }
                      onClick={onNavigate}
                    >
                      <NavIcon name={child.icon} />
                      <span className="admin-sidebar__link-text">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={() =>
                `admin-sidebar__link${
                  isTopLevelNavActive(location.pathname, item.to) ? " admin-sidebar__link--active" : ""
                }`
              }
              onClick={onNavigate}
            >
              <NavIcon name={item.icon} />
              <span className="admin-sidebar__link-text">{item.label}</span>
            </NavLink>
          )
        )}
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
