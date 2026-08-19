import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import {
  fetchAdminInbox,
  markAdminInboxItemRead,
  markAllAdminInboxRead,
} from "../api/adminInboxApi.js";
import { useInbox } from "../context/InboxContext.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";

const KIND_LABELS = {
  system: "System",
  user_joined: "User joined",
  meal_log: "Meal log",
  meal_log_reviewed: "Meal reviewed",
  diet_plan_assignment: "Diet plan",
  wellness_prescription_assignment: "Prescription",
  onboarding_slots_offered: "Onboarding",
  onboarding_meeting_confirmed: "Onboarding",
  program_checkout_triggered: "Checkout",
  program_assigned: "Program",
  coach_reminder: "Reminder",
  physical_exercise_assigned: "Exercise",
  mental_wellbeing_assigned: "Wellbeing",
  yoga_assigned: "Yoga",
  birthday_wish: "Birthday",
  birthday_reminder: "Birthday",
  monthly_champion: "Champion",
  monthly_champion_comment: "Champion",
  internal_parameters_recommendation: "Parameters",
  internal_parameters_upload: "Parameters",
  admin_broadcast: "Broadcast",
  health_tool: "Health tool",
  recipe: "Recipe",
};

const ALL_FILTER = "all";
const UNREAD_FILTER = "unread";
const READ_FILTER = "read";

const FILTERS = [
  { id: ALL_FILTER, label: "All" },
  { id: UNREAD_FILTER, label: "Unread" },
  { id: READ_FILTER, label: "Read" },
];

const PAGE_SIZE = 50;

function kindLabel(kindKey) {
  if (!kindKey) return "System";
  return KIND_LABELS[kindKey] || kindKey.replace(/_/g, " ");
}

function kindColor(kindKey) {
  if (!kindKey) return { color: "#5e6ad2", bg: "#eef0fc" };
  const map = {
    birthday_wish: { color: "#c2559a", bg: "#fdf6fb" },
    birthday_reminder: { color: "#c2559a", bg: "#fdf6fb" },
    monthly_champion: { color: "#c2891b", bg: "#fffdf5" },
    monthly_champion_comment: { color: "#c2891b", bg: "#fffdf5" },
    program_assigned: { color: "#2b8f5b", bg: "#f7fbf9" },
    program_checkout_triggered: { color: "#2b8f5b", bg: "#f7fbf9" },
    diet_plan_assignment: { color: "#0d9488", bg: "#f0fdfa" },
    wellness_prescription_assignment: { color: "#0d9488", bg: "#f0fdfa" },
    onboarding_slots_offered: { color: "#ec7a45", bg: "#fff9f4" },
    onboarding_meeting_confirmed: { color: "#ec7a45", bg: "#fff9f4" },
    admin_broadcast: { color: "#5e6ad2", bg: "#eef0fc" },
    coach_reminder: { color: "#a855f7", bg: "#faf5ff" },
    meal_log_reviewed: { color: "#2b8f5b", bg: "#f7fbf9" },
  };
  return map[kindKey] || { color: "#5e6ad2", bg: "#eef0fc" };
}

function NotifRow({ notif, onMarkRead, onClick }) {
  const { color, bg } = kindColor(notif.kindKey);
  return (
    <div
      className={`npage__row${notif.unread ? " npage__row--unread" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick(notif)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick(notif)}
    >
      <span className="npage__row-icon" style={{ fontSize: 22 }}>{notif.icon}</span>
      <div className="npage__row-body">
        <div className="npage__row-meta">
          <span className="npage__row-kind" style={{ color, background: bg }}>
            {kindLabel(notif.kindKey)}
          </span>
          <span className="npage__row-time">{notif.time}</span>
          {notif.unread && <span className="npage__row-dot" />}
        </div>
        <div className="npage__row-title">{notif.title}</div>
        {notif.from && notif.from !== "System" && (
          <div className="npage__row-from">From {notif.from}</div>
        )}
      </div>
      {notif.unread && (
        <button
          type="button"
          className="npage__row-readbtn"
          title="Mark as read"
          onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
        >
          ✓
        </button>
      )}
    </div>
  );
}

export function NotificationsPage() {
  const { showToast } = useOutletContext() || {};
  const { activeRole } = useViewAs();
  const { loadInbox } = useInbox();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState(ALL_FILTER);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadRef = useRef(false);

  const load = useCallback(async (pageNum = 1, append = false) => {
    if (loadRef.current) return;
    loadRef.current = true;
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const unreadOnly = filter === UNREAD_FILTER;
      const data = await fetchAdminInbox({ page: pageNum, limit: PAGE_SIZE, unreadOnly });
      const items = data?.notifications || [];
      const total = data?.pagination?.total || 0;
      setNotifications((prev) => {
        const next = append ? [...prev, ...items] : items;
        setHasMore(next.length < total);
        return next;
      });
      setPage(pageNum);
    } catch (err) {
      console.error("[NotificationsPage] load failed:", err?.message || err);
    } finally {
      loadRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const displayed = useMemo(() => {
    if (filter === READ_FILTER) return notifications.filter((n) => !n.unread);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications],
  );

  async function handleMarkRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
    try {
      await markAdminInboxItemRead(id);
      loadInbox({ silent: true });
    } catch (err) {
      showToast?.(err?.message || "Could not mark as read");
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: true } : n)),
      );
    }
  }

  async function handleMarkAllRead() {
    if (markingAll) return;
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await markAllAdminInboxRead();
      showToast?.("All notifications marked as read");
      loadInbox({ silent: true });
    } catch (err) {
      showToast?.(err?.message || "Could not mark all as read");
      load(1, false);
    } finally {
      setMarkingAll(false);
    }
  }

  function handleRowClick(notif) {
    if (notif.unread) handleMarkRead(notif.id);
    if (notif.href) navigate(notif.href);
  }

  return (
    <div className="npage">
      <div className="npage__head">
        <div className="npage__head-left">
          <h1 className="npage__title">Notifications</h1>
          <span
            className="npage__role-chip"
            style={{ color: activeRole.color, background: activeRole.bg }}
          >
            {activeRole.name}
          </span>
          {unreadCount > 0 && (
            <span className="npage__unread-chip">{unreadCount} unread</span>
          )}
        </div>
        <div className="npage__head-right">
          <button
            type="button"
            className="npage__markall-btn"
            disabled={unreadCount === 0 || markingAll}
            onClick={handleMarkAllRead}
          >
            {markingAll ? "Marking…" : "Mark all read"}
          </button>
        </div>
      </div>

      <div className="npage__filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`npage__filter-btn${filter === f.id ? " npage__filter-btn--active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id === UNREAD_FILTER && unreadCount > 0 && (
              <span className="npage__filter-count">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="npage__body">
        {loading ? (
          <div className="npage__loader">
            <BrandLoader />
          </div>
        ) : displayed.length === 0 ? (
          <div className="npage__empty">
            <span className="npage__empty-icon">🔔</span>
            <p className="npage__empty-text">
              {filter === UNREAD_FILTER
                ? "You're all caught up — no unread notifications."
                : filter === READ_FILTER
                ? "No read notifications yet."
                : "No notifications yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="npage__list">
              {displayed.map((n) => (
                <NotifRow
                  key={n.id}
                  notif={n}
                  onMarkRead={handleMarkRead}
                  onClick={handleRowClick}
                />
              ))}
            </div>

            {hasMore && (
              <div className="npage__loadmore">
                <button
                  type="button"
                  className="npage__loadmore-btn"
                  disabled={loadingMore}
                  onClick={() => load(page + 1, true)}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}

            {!hasMore && displayed.length > 0 && (
              <div className="npage__end">
                Showing all {displayed.length} notification{displayed.length !== 1 ? "s" : ""}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
