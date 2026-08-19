import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { useInbox } from "../context/InboxContext.jsx";
import "./notificationInbox.css";

const ROLE_NOTIF_SUBTITLES = {
  admin: "All console activity",
  wc: "Your assigned clients",
  awc: "Your team's activity",
  support: "Content & feedback",
  trainee: "Learning activities",
};

const COMPACT_MQ = "(max-width: 960px)";

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
  const [compact, setCompact] = useState(() => (
    typeof window !== "undefined" ? window.matchMedia(COMPACT_MQ).matches : false
  ));
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  function positionPanel() {
    const btn = btnRef.current;
    if (!btn || compact) return;
    const rect = btn.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }

  useEffect(() => {
    const media = window.matchMedia(COMPACT_MQ);
    function sync() {
      setCompact(media.matches);
    }
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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
  }, [open, compact, loadInbox]);

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

  function closeAndOpen(id) {
    setOpen(false);
    handleNotifClick(id);
  }

  const list = (
    <>
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
          className={`header__notif-item${n.unread ? " is-unread" : ""}`}
          onClick={() => closeAndOpen(n.id)}
        >
          <span className="header__notif-item-icon" aria-hidden="true">{n.icon}</span>
          <span className="header__notif-item-body">
            <span className="header__notif-item-meta">
              <span className="header__notif-item-kind">{n.kind}</span>
              <span className="header__notif-item-time">{n.time}</span>
            </span>
            <span className="header__notif-item-title">{n.title}</span>
            {n.from && n.from !== "System" ? (
              <span className="header__notif-item-from">From {n.from}</span>
            ) : null}
          </span>
          {n.unread ? (
            <span className="header__notif-item-status" aria-label="Unread" />
          ) : (
            <span className="header__notif-item-chevron" aria-hidden="true">›</span>
          )}
        </button>
      ))}
    </>
  );

  const head = (
    <div className="header__notif-head">
      <span className="header__notif-head-icon" aria-hidden="true">🔔</span>
      <div className="header__notif-head-copy">
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
      <button
        type="button"
        className="header__notif-close"
        aria-label="Close notifications"
        onClick={() => setOpen(false)}
      >
        ×
      </button>
    </div>
  );

  const viewAll = (
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
  );

  const panel = !open
    ? null
    : compact
      ? createPortal(
          <div
            className="header__notif-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div className="header__notif-sheet" ref={panelRef} role="dialog" aria-label="Notifications">
              {head}
              <div className="header__notif-list">{list}</div>
              {viewAll}
            </div>
          </div>,
          document.body,
        )
      : createPortal(
          <div
            ref={panelRef}
            className="header__notif-panel header__notif-panel--portal"
            role="dialog"
            aria-label="Notifications"
            style={{ top: coords.top, right: coords.right }}
          >
            {head}
            <div className="header__notif-list">{list}</div>
            {viewAll}
          </div>,
          document.querySelector(".updated-admin") || document.body,
        );

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
