import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UPDATED_ADMIN_PATHS } from "../../data/dashboardData.js";
import { NotificationInboxPanel } from "../NotificationInboxPanel.jsx";
import { useViewAs } from "../../context/ViewAsContext.jsx";

function clientInitials(name) {
  const parts = String(name || "Client").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ClientAvatar({ user, className = "" }) {
  const src = user?.profileImage;
  const name = user?.name || "Client";
  return (
    <div className={`ua-cp-sidebar__avatar${src ? "" : " ua-cp-sidebar__avatar--initials"} ${className}`.trim()}>
      {src ? (
        <img src={src} alt={name} className="ua-cp-sidebar__avatar-img" />
      ) : (
        <span className="ua-cp-sidebar__avatar-ph" aria-hidden="true">
          {clientInitials(name)}
        </span>
      )}
    </div>
  );
}

export function ClientProfileTopbar({
  menuHidden,
  onToggleMenu,
  onSave,
}) {
  const { can } = useViewAs();
  const canEditPii = can("console.pii.edit");

  return (
    <header className="ua-cp-topbar">
      <Link to={UPDATED_ADMIN_PATHS.users} className="ua-cp-topbar__btn">← Users</Link>
      <button type="button" className="ua-cp-topbar__btn ua-cp-topbar__btn--menu" onClick={onToggleMenu} title="Toggle menu">
        {menuHidden ? "▥ Show menu" : "▤ Hide menu"}
      </button>
      <div className="ua-cp-topbar__title">Client profile</div>
      <div className="ua-cp-topbar__actions">
          {canEditPii ? (
            <button type="button" className="ua-cp-topbar__icon ua-cp-topbar__icon--save" title="Save profile" onClick={onSave} aria-label="Save">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <path d="M17 21v-8H7v8" />
                <path d="M7 3v5h8" />
              </svg>
            </button>
          ) : null}
          <NotificationInboxPanel
            wrapClassName="ua-cp-topbar__bell-wrap"
            btnClassName="ua-cp-topbar__icon ua-cp-topbar__icon--bell"
          />
      </div>
    </header>
  );
}

export function ClientProfileSidebar({
  user,
  menu = [],
  activeSection,
  onSectionChange,
  hidden,
  showAllTags,
  onToggleTags,
  compact = false,
}) {
  const tags = Array.isArray(user?.tags) ? user.tags : [];
  const visibleTags = showAllTags ? tags : tags.slice(0, 2);
  const extraTags = tags.length - 2;
  const programLabel = user?.programLabel || "—";
  const programs = user?.programs ?? 0;
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function closeMobileSidebar() {
    setMobileOpen(false);
  }

  function handleSectionChange(id) {
    onSectionChange(id);
    closeMobileSidebar();
  }

  return (
    <aside
      ref={sidebarRef}
      className={`ua-cp-sidebar${hidden ? " ua-cp-sidebar--hidden" : ""}${mobileOpen ? " ua-cp-sidebar--mobile-open" : ""}`}
    >
      <div className="ua-cp-sidebar__mobile-card">
        <ClientAvatar user={user} />
        <div className="ua-cp-sidebar__mobile-meta">
          <div className="ua-cp-sidebar__mobile-name">{user?.name || "Client"}</div>
          <div className="ua-cp-sidebar__mobile-sub">{programLabel} · {programs} programs</div>
          <button
            type="button"
            className="ua-cp-sidebar__view-btn"
            aria-expanded={mobileOpen}
            aria-controls="ua-cp-sidebar-panel"
            aria-label={`View ${user?.name || "client"} menu`}
            onClick={() => setMobileOpen(true)}
          >
            View
          </button>
        </div>
      </div>

      <button
        type="button"
        className="ua-cp-sidebar__backdrop"
        tabIndex={-1}
        aria-hidden="true"
        onClick={closeMobileSidebar}
      />

      <div id="ua-cp-sidebar-panel" className="ua-cp-sidebar__panel">
        <div className="ua-cp-sidebar__panel-head">
          <span className="ua-cp-sidebar__panel-title">Client menu</span>
          <button
            type="button"
            className="ua-cp-sidebar__close"
            onClick={closeMobileSidebar}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <div className="ua-cp-sidebar__profile">
          <div className="ua-cp-sidebar__profile-row">
            <ClientAvatar user={user} className="ua-cp-sidebar__avatar--desktop" />
            <div className="ua-cp-sidebar__info">
              <div className="ua-cp-sidebar__name">{user?.name || "Client"}</div>
              <div className="ua-cp-sidebar__sub">
                {programLabel} · {programs} {programs === 1 ? "program" : "programs"}
              </div>
            </div>
          </div>
          <div className="ua-cp-sidebar__tags">
            {visibleTags.map((tag, i) => (
              <span key={`${tag}-${i}`} className={`ua-cp-tag ua-cp-tag--${i % 3}`}>{tag}</span>
            ))}
            {!showAllTags && extraTags > 0 ? (
              <button type="button" className="ua-cp-tag ua-cp-tag--more" onClick={onToggleTags}>+{extraTags} more</button>
            ) : null}
          </div>
        </div>

        {compact ? null : (
          <div className="ua-cp-sidebar__sub-box">
            <strong>{user?.subscriptionDays ?? 0}</strong>
            <span>days left<br />on app subscription</span>
          </div>
        )}

        <div className="ua-cp-sidebar__menu-label">Menu list</div>
        <nav className="ua-cp-sidebar__nav">
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ua-cp-sidebar__link${activeSection === item.id ? " ua-cp-sidebar__link--active" : ""}${item.accent ? " ua-cp-sidebar__link--accent" : ""}`}
              onClick={() => handleSectionChange(item.id)}
            >
              <span>{item.label}</span>
              <span className="ua-cp-sidebar__caret">›</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
