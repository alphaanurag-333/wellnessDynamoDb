import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { NavIcon } from "./NavIcons.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import {
  NAV_ITEMS,
  UPDATED_ADMIN_PATHS,
  VIEW_AS_ROLES,
} from "../data/dashboardData.js";
import { useAppSelector } from "../store/hooks.js";
import { selectAdminLogoUrl, selectAppName } from "../store/slices/appConfigSlice.js";

function RoleCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function RoleCaretIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CollapseIcon({ collapsed }) {
  return collapsed ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function ViewAsRolePicker({ collapsed }) {
  const navigate = useNavigate();
  const { viewAs, setViewAs, activeRole, availableUiRoles } = useViewAs();
  const [open, setOpen] = useState(false);
  const roles = availableUiRoles?.length ? availableUiRoles : VIEW_AS_ROLES;
  const staffTotal = roles.reduce((sum, role) => sum + (Number(role.live) || 0), 0);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (collapsed) setOpen(false);
  }, [collapsed]);

  const pickRole = async (role) => {
    setOpen(false);
    if (!role.switchable) {
      navigate(UPDATED_ADMIN_PATHS.access);
      return;
    }
    try {
      await setViewAs(role.id);
    } catch {
      /* local fallback already applied in context */
    }
  };

  return (
    <div className="sidebar__viewas-wrap">
      <button
        type="button"
        className={`sidebar__viewas-trigger${open ? " sidebar__viewas-trigger--open" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        title={`Viewing as ${activeRole.name} — switch role`}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className="sidebar__viewas-dot"
          style={{
            background: activeRole.color,
            boxShadow: `0 0 0 3px ${activeRole.bg}`,
          }}
        />
        {!collapsed ? (
          <>
            <span className="sidebar__viewas-text">
              <span className="sidebar__viewas-kicker">Viewing as</span>
              <span className="sidebar__viewas-name">{activeRole.name}</span>
            </span>
            <span className="sidebar__viewas-caret">
              <RoleCaretIcon />
            </span>
          </>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="sidebar__viewas-backdrop"
            aria-label="Close role menu"
            onClick={() => setOpen(false)}
          />
          <div className={`sidebar__viewas-menu${collapsed ? " sidebar__viewas-menu--rail" : ""}`} role="menu">
            <div className="sidebar__viewas-menu-head">
              <span>Live roles</span>
              <span>{staffTotal} staff</span>
            </div>
            {roles.map((role) => {
              const active = viewAs === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  className={`sidebar__viewas-option${active ? " sidebar__viewas-option--active" : ""}`}
                  onClick={() => pickRole(role)}
                >
                  <span
                    className="sidebar__viewas-option-dot"
                    style={{ background: role.color }}
                  />
                  <span className="sidebar__viewas-option-copy">
                    <span className="sidebar__viewas-option-name">{role.name}</span>
                    <span className="sidebar__viewas-option-meta">
                      {role.live} live
                      {!role.switchable ? " · open in Access Control" : ""}
                    </span>
                  </span>
                  {active ? (
                    <span className="sidebar__viewas-option-check">
                      <RoleCheckIcon />
                    </span>
                  ) : null}
                </button>
              );
            })}
            <div className="sidebar__viewas-menu-foot">
              Switches the whole console to that role&apos;s sections and permissions.
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

const NAV_COLLAPSED_KEY = "ua-nav-collapsed";

export function AdminSidebar({ onLogout, mobileOpen = false, onCloseMobile }) {
  const { viewAs, isSuperAdmin, navSections } = useViewAs();
  const adminLogoUrl = useAppSelector(selectAdminLogoUrl);
  const brandName = useAppSelector(selectAppName);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore storage errors */
    }
  }, [collapsed]);

  useEffect(() => {
    if (mobileOpen) setCollapsed(false);
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((value) => !value);
  }

  // A section appears as soon as Access Control grants any permission inside it.
  const visibleNav = useMemo(
    () => NAV_ITEMS.filter((item) => navSections.has(item.id) || (item.visibleWith && navSections.has(item.visibleWith))),
    [navSections],
  );

  return (
    <>
      <button
        type="button"
        className={`sidebar__backdrop${mobileOpen ? " sidebar__backdrop--open" : ""}`}
        tabIndex={-1}
        aria-hidden="true"
        onClick={onCloseMobile}
      />
      <aside
        className={`sidebar${collapsed ? " sidebar--rail" : ""}${mobileOpen ? " sidebar--mobile-open" : ""}`}
        aria-label="Main navigation"
      >
      <div className="sidebar__brand">
        <NavLink to={UPDATED_ADMIN_PATHS.dashboard} end className="sidebar__brand-link">
          <div className="sidebar__logo">
            {adminLogoUrl ? (
              <img
                src={adminLogoUrl}
                alt=""
                className="sidebar__logo-img"
              />
            ) : (
              "IR"
            )}
          </div>
          {!collapsed ? (
            <div className="sidebar__brand-text">
              <div className="sidebar__brand-name" title={brandName}>{brandName}</div>
              <div className="sidebar__brand-sub">
                {isSuperAdmin && viewAs === "admin" ? "SUPER ADMIN" : "ADMIN CONSOLE"}
              </div>
            </div>
          ) : null}
        </NavLink>
        <button
          type="button"
          className="sidebar__toggle"
          title={collapsed ? "Expand the sidebar" : "Collapse to icons"}
          aria-label={collapsed ? "Expand the sidebar" : "Collapse to icons"}
          onClick={toggleCollapsed}
        >
          <CollapseIcon collapsed={collapsed} />
        </button>
        <button
          type="button"
          className="sidebar__close"
          aria-label="Close menu"
          onClick={onCloseMobile}
        >
          ×
        </button>
      </div>

      <nav className="sidebar__nav">
        {!collapsed ? <div className="sidebar__sections-label">Sections</div> : null}
        {visibleNav.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.id === "dashboard"}
            title={item.label}
            className={({ isActive }) =>
              `sidebar__link${isActive ? " sidebar__link--active" : ""}`
            }
            onClick={onCloseMobile}
          >
            <NavIcon name={item.icon} />
            {!collapsed ? <span className="sidebar__link-label">{item.label}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <ViewAsRolePicker collapsed={collapsed} />
        <button
          type="button"
          className="sidebar__logout"
          title="Logout"
          onClick={onLogout}
        >
          <NavIcon name="logout" />
          {!collapsed ? <span>Logout</span> : null}
        </button>
      </div>
    </aside>
    </>
  );
}
