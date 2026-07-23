import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { panelNavItems } from "../data/navConfig.js";
import { selectAppDisplayName, selectPanelLogoUrl } from "../../store/appConfigSelectors.js";
import {
  selectIsStaffSuperAdmin,
  selectStaffAccountType,
  selectStaffPermissions,
} from "../../store/staffAuthSelectors.js";
import { mediaUrl } from "../../media.js";
import { logout, logoutAssistant, logoutCoach, logoutStaff } from "../../store/authSlice.js";
import { confirmLogout } from "../utils/confirmLogout.js";
import { filterPanelNavItems, resolveNavHref } from "../utils/navAccess.js";
import { NavIcon } from "../../admin/components/NavIcon.jsx";
import defaultLogo from "../../assets/logo/defaultlogo.png";

const NAV_GROUP_PATTERNS = {
  administration: /\/panel\/(staff-accounts|roles)(\/|$)/,
  myTeam: /\/(coach|assistant)\/(my-users|meal-approvals|my-assistants)(\/|$)/,
};

function normalizePath(pathname) {
  return pathname.replace(/\/$/, "") || "/";
}

function pathInGroup(pathname, groupId) {
  return Boolean(NAV_GROUP_PATTERNS[groupId]?.test(pathname));
}

function pathMatchesHref(pathname, href) {
  const base = normalizePath(href);
  const p = normalizePath(pathname);
  return p === base || p.startsWith(`${base}/`);
}

export function PanelSidebar({ id = "panel-sidebar", onNavigate, drawerOpen, desktopCollapsed }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const brandLogoUrl = useSelector(selectPanelLogoUrl);
  const appDisplayName = useSelector(selectAppDisplayName);
  const isSuperAdmin = useSelector(selectIsStaffSuperAdmin);
  const accountType = useSelector(selectStaffAccountType);
  const permissions = useSelector(selectStaffPermissions);
  const logoSrc = mediaUrl(brandLogoUrl) || defaultLogo;

  const visibleNavItems = useMemo(
    () => filterPanelNavItems(panelNavItems, { isSuperAdmin, permissions, accountType }),
    [isSuperAdmin, permissions, accountType],
  );

  const initialOpen = useMemo(() => {
    const open = {};
    for (const groupId of Object.keys(NAV_GROUP_PATTERNS)) {
      open[groupId] = pathInGroup(location.pathname, groupId);
    }
    return open;
  }, [location.pathname]);

  const [openGroups, setOpenGroups] = useState(() => ({ ...initialOpen }));

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const groupId of Object.keys(NAV_GROUP_PATTERNS)) {
        if (initialOpen[groupId] && !prev[groupId]) {
          next[groupId] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [initialOpen]);

  const handleLogout = async () => {
    const ok = await confirmLogout();
    if (!ok) return;
    // Every login now funnels through `/panel/login`, so clear every legacy
    // slot too — a Panel session for an Admin/Coach/Assistant account mirrors
    // into their own slot (see `PanelLoginPage`), and a stale one left behind
    // would let a "logged out" tab still pass a legacy layout's token guard.
    dispatch(logoutStaff());
    dispatch(logout());
    dispatch(logoutCoach());
    dispatch(logoutAssistant());
    navigate("/panel/login", { replace: true });
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
          <div className="admin-sidebar__subtitle">Panel</div>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        {visibleNavItems.map((item) =>
          Array.isArray(item.children) && item.id ? (
            <div key={item.id} className="admin-sidebar__group">
              <button
                type="button"
                className={`admin-sidebar__link admin-sidebar__group-btn${
                  item.children.some((c) => pathMatchesHref(location.pathname, resolveNavHref(c, accountType)))
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
                      to={resolveNavHref(child, accountType)}
                      title={child.label}
                      className={() =>
                        `admin-sidebar__link admin-sidebar__link--child${
                          pathMatchesHref(location.pathname, resolveNavHref(child, accountType))
                            ? " admin-sidebar__link--active"
                            : ""
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
              to={resolveNavHref(item, accountType)}
              title={item.label}
              className={() =>
                `admin-sidebar__link${
                  pathMatchesHref(location.pathname, resolveNavHref(item, accountType))
                    ? " admin-sidebar__link--active"
                    : ""
                }`
              }
              onClick={onNavigate}
            >
              <NavIcon name={item.icon} />
              <span className="admin-sidebar__link-text">{item.label}</span>
            </NavLink>
          ),
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
