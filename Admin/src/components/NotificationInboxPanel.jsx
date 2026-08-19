import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { useInbox } from "../context/InboxContext.jsx";

const ROLE_NOTIF_SUBTITLES = {
  admin: "All console activity",
  wc: "Your assigned clients",
  awc: "Your team's activity",
  support: "Content & feedback",
  trainee: "Learning activities",
};

export function NotificationInboxPanel({ wrapClassName = "header__notif-wrap", btnClassName = "header__notif-btn" }) {
  const navigate = useNavigate();
  const { activeRole } = useViewAs();
  const {
    notifications,
    unreadCount,
    inboxLoading,
    loadInbox,
    handleNotifClick,
    handleMarkAllRead,
  } = useInbox();

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 12 });
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  function positionPanel() {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }

  useLayoutEffect(() => {
    if (!open) return undefined;
    positionPanel();
    loadInbox({ silent: true });
    function onResize() {
      positionPanel();
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, loadInbox]);

  useEffect(() => {
    if (!open) return undefined;

    function handleClick(event) {
      if (
        panelRef.current?.contains(event.target) ||
        btnRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKey(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const isClientBell = btnClassName.includes("ua-cp-topbar__icon");

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className="header__notif-panel header__notif-panel--portal"
          role="dialog"
          aria-label="Notifications"
          style={{ top: coords.top, right: coords.right }}
        >
          <div className="header__notif-head">
            <span>🔔</span>
            <div>
              <div className="header__notif-title">Notifications</div>
              <div className="header__notif-sub">
                {ROLE_NOTIF_SUBTITLES[activeRole?.id] || "Everything across the console"}
              </div>
            </div>
            <button
              type="button"
              className="header__notif-mark"
              onClick={handleMarkAllRead}
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
              onClick={() => {
                setOpen(false);
                handleNotifClick(n.id);
              }}
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
                {n.from && n.from !== "System" ? (
                  <span style={{ fontSize: 10.5, color: "#8a97ac" }}>From {n.from}</span>
                ) : null}
              </span>
              {n.unread ? (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5e6ad2", flexShrink: 0, marginTop: 2 }} />
              ) : (
                <span style={{ color: "#c0c9d6", fontSize: 15 }}>›</span>
              )}
            </button>
          ))}
          <button
            type="button"
            className="header__notif-viewall"
            onClick={() => {
              setOpen(false);
              navigate(UPDATED_ADMIN_PATHS.notifications);
            }}
          >
            View all notifications →
          </button>
        </div>,
        document.querySelector(".updated-admin") || document.body,
      )
    : null;

  return (
    <div className={wrapClassName}>
      <button
        ref={btnRef}
        type="button"
        className={btnClassName}
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {isClientBell ? <span aria-hidden="true">🔔</span> : "🔔"}
        {unreadCount > 0 ? (
          <span className={isClientBell ? "ua-cp-topbar__badge" : "header__notif-badge"}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
