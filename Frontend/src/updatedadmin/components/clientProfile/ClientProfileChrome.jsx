import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CLIENT_MENU, CLIENT_NOTIFICATIONS } from "../../data/userDetailData.js";
import { UPDATED_ADMIN_PATHS } from "../../data/dashboardData.js";

export function ClientProfileTopbar({
  menuHidden,
  onToggleMenu,
  onBack,
  showBack,
  onSave,
  notifications = CLIENT_NOTIFICATIONS,
}) {
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const unreadCount = notifications.items.length;

  useEffect(() => {
    if (!bellOpen) return undefined;
    function onDocClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [bellOpen]);

  return (
    <header className="ua-cp-topbar">
      <Link to={UPDATED_ADMIN_PATHS.users} className="ua-cp-topbar__btn">← Users</Link>
      {showBack ? (
        <button type="button" className="ua-cp-topbar__btn ua-cp-topbar__btn--back" onClick={onBack} title="Back to previous screen">‹ Back</button>
      ) : null}
      <button type="button" className="ua-cp-topbar__btn" onClick={onToggleMenu} title="Toggle menu">
        {menuHidden ? "▥ Show menu" : "▤ Hide menu"}
      </button>
      <div className="ua-cp-topbar__title">Client profile</div>
      <button type="button" className="ua-cp-topbar__icon ua-cp-topbar__icon--save" title="Save profile" onClick={onSave} aria-label="Save">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" />
        </svg>
      </button>
      <div className="ua-cp-topbar__bell-wrap" ref={bellRef}>
        <button
          type="button"
          className="ua-cp-topbar__icon ua-cp-topbar__icon--bell"
          title="Notifications"
          aria-label="Notifications"
          aria-expanded={bellOpen}
          onClick={() => setBellOpen((o) => !o)}
        >
          <span aria-hidden="true">🔔</span>
          {unreadCount > 0 ? <span className="ua-cp-topbar__badge">{unreadCount}</span> : null}
        </button>
        {bellOpen ? (
          <div className="ua-cp-notif-panel header__notif-panel" role="dialog" aria-label="Notifications">
            <div className="ua-cp-notif-panel__head">
              <span className="ua-cp-notif-panel__title">Notifications</span>
              <span className="ua-cp-notif-panel__count">{unreadCount}</span>
              <button type="button" className="ua-cp-notif-panel__close" onClick={() => setBellOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="ua-cp-notif-panel__last">
              <span className="ua-cp-notif-panel__last-icon">{notifications.lastAction.icon}</span>
              <div className="ua-cp-notif-panel__last-body">
                <div className="ua-cp-notif-panel__last-label">Last action</div>
                <div className="ua-cp-notif-panel__last-text">{notifications.lastAction.text}</div>
              </div>
              <span className="ua-cp-notif-panel__last-time">{notifications.lastAction.time}</span>
            </div>
            <div className="ua-cp-notif-panel__list">
              {notifications.items.map((n, i) => (
                <div key={i} className="ua-cp-notif-panel__item">
                  <span className="ua-cp-notif-panel__item-icon">{n.icon}</span>
                  <div className="ua-cp-notif-panel__item-text">{n.text}</div>
                  <span className="ua-cp-notif-panel__item-time">{n.time}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function ClientProfileSidebar({ user, activeSection, onSectionChange, hidden, showAllTags, onToggleTags }) {
  const visibleTags = showAllTags ? user.tags : user.tags.slice(0, 2);
  const extraTags = user.tags.length - 2;

  return (
    <aside className={`ua-cp-sidebar${hidden ? " ua-cp-sidebar--hidden" : ""}`}>
      <div className="ua-cp-sidebar__profile">
        <div className="ua-cp-sidebar__avatar">
          <span className="ua-cp-sidebar__avatar-ph">Photo</span>
        </div>
        <div className="ua-cp-sidebar__info">
          <div className="ua-cp-sidebar__name">{user.name}</div>
          <div className="ua-cp-sidebar__sub">{user.programLabel} · {user.programs} programs</div>
          <div className="ua-cp-sidebar__tags">
            {visibleTags.map((tag, i) => (
              <span key={tag} className={`ua-cp-tag ua-cp-tag--${i % 3}`}>{tag}</span>
            ))}
            {!showAllTags && extraTags > 0 ? (
              <button type="button" className="ua-cp-tag ua-cp-tag--more" onClick={onToggleTags}>+{extraTags} more</button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ua-cp-sidebar__sub-box">
        <strong>{user.subscriptionDays}</strong>
        <span>days left<br />on app subscription</span>
      </div>

      <div className="ua-cp-sidebar__menu-label">Menu list</div>
      <nav className="ua-cp-sidebar__nav">
        {CLIENT_MENU.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`ua-cp-sidebar__link${activeSection === item.id ? " ua-cp-sidebar__link--active" : ""}${item.accent ? " ua-cp-sidebar__link--accent" : ""}`}
            onClick={() => onSectionChange(item.id)}
          >
            <span>{item.label}</span>
            <span className="ua-cp-sidebar__caret">›</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
