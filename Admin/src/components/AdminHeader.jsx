import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { userInitials } from "../data/usersData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

export function AdminHeader({
  notifications,
  unreadCount,
  notifOpen,
  inboxLoading = false,
  onToggleNotif,
  onCloseNotif,
  onMarkAllRead,
  onNotifClick,
  onOpenProfile,
  onOpenMobileNav,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDashboard = pathname === UPDATED_ADMIN_PATHS.dashboard || pathname === "/";
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const { activeRole, account } = useViewAs();
  const avatarInitial = userInitials(account?.name || activeRole.name).charAt(0) || "A";
  const profileImage = account?.profileImage || null;

  useEffect(() => {
    if (!notifOpen) return undefined;

    function handleClick(event) {
      if (
        panelRef.current?.contains(event.target) ||
        btnRef.current?.contains(event.target)
      ) {
        return;
      }
      onCloseNotif();
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [notifOpen, onCloseNotif]);

  return (
    <header className="header">
      <button
        type="button"
        className="header__menu"
        aria-label="Open menu"
        onClick={onOpenMobileNav}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {isDashboard ? null : (
        <button
          type="button"
          className="header__back"
          title="Go back"
          onClick={() => navigate(-1)}
        >
          ‹ Back
        </button>
      )}

      <div className="header__search">
        <svg className="header__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input type="search" className="header__search-input" placeholder="Search users, teams, policies…" aria-label="Search" />
      </div>

      <div className="header__actions">
        <div className="header__notif-wrap">
          <button
            ref={btnRef}
            type="button"
            className="header__notif-btn"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            onClick={onToggleNotif}
          >
            🔔
            {unreadCount > 0 ? <span className="header__notif-badge">{unreadCount}</span> : null}
          </button>

          {notifOpen ? (
            <div ref={panelRef} className="header__notif-panel">
              <div className="header__notif-head">
                <span>🔔</span>
                <div>
                  <div className="header__notif-title">Notifications</div>
                  <div className="header__notif-sub">Everything across the console</div>
                </div>
                <button
                  type="button"
                  className="header__notif-mark"
                  onClick={onMarkAllRead}
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </button>
              </div>
              {inboxLoading && notifications.length === 0 ? (
                <div className="header__notif-empty">Loading notifications…</div>
              ) : null}
              {!inboxLoading && notifications.length === 0 ? (
                <div className="header__notif-empty">No console events yet</div>
              ) : null}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="header__notif-item"
                  style={{ background: n.unread ? "#f9fbfd" : "#fff" }}
                  onClick={() => onNotifClick(n.id)}
                >
                  <span style={{ fontSize: 18 }}>{n.icon}</span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#5e6ad2", background: "#eef0fc", padding: "2px 6px", borderRadius: 4 }}>
                        {n.kind}
                      </span>
                      <span style={{ fontSize: 9.5, color: "#b0bacb" }}>{n.time}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 650, color: "#16233f", lineHeight: 1.35 }}>{n.title}</span>
                    <span style={{ fontSize: 10.5, color: "#8a97ac" }}>From {n.from}</span>
                  </span>
                  <span style={{ color: "#c0c9d6", fontSize: 15 }}>›</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="header__profile">
          <span
            className="header__profile-badge"
            style={{
              color: activeRole.color,
              background: activeRole.bg,
              borderColor: `${activeRole.color}33`,
            }}
          >
            {activeRole.name}
          </span>
          <button type="button" className="header__avatar" aria-label="My profile" onClick={onOpenProfile}>
            {profileImage ? (
              <img className="header__avatar-img" src={profileImage} alt="" />
            ) : (
              avatarInitial
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
