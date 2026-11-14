import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchAdminInbox,
  markAdminInboxItemRead,
  markAllAdminInboxRead,
} from "../api/adminInboxApi.js";
import { dispatchCounsellingActivity } from "../utils/counsellingLiveRefresh.js";
import { useAdminRealtime } from "./AdminRealtimeContext.jsx";

const InboxContext = createContext(null);

export function InboxProvider({ children, onToast }) {
  const navigate = useNavigate();
  const { connected, onStaffInboxChanged } = useAdminRealtime();
  const [notifications, setNotifications] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const inboxInitializedRef = useRef(false);
  const inboxIdsRef = useRef(new Set());

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  const loadInbox = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setInboxLoading(true);
    try {
      const data = await fetchAdminInbox({ page: 1, limit: 40, unreadOnly: true });
      const list = data?.notifications || [];
      if (inboxInitializedRef.current) {
        for (const item of list) {
          if (inboxIdsRef.current.has(item.id)) continue;
          if (String(item.kindKey || "").toLowerCase() !== "counselling") continue;
          dispatchCounsellingActivity({
            subjectUserId: item.subjectUserId || null,
            referenceId: item.referenceId || null,
            activityId: item.id,
          });
        }
      } else {
        inboxInitializedRef.current = true;
      }
      inboxIdsRef.current = new Set(list.map((item) => item.id));
      setNotifications(list);
    } catch (err) {
      if (!silent) {
        console.error("[AdminInbox] load failed:", err?.message || err);
      }
    } finally {
      if (!silent) setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  useEffect(() => onStaffInboxChanged(() => loadInbox({ silent: true })), [loadInbox, onStaffInboxChanged]);

  useEffect(() => {
    const run = () => loadInbox({ silent: true });
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    const onFocus = () => run();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadInbox]);

  useEffect(() => {
    if (connected) loadInbox({ silent: true });
  }, [connected, loadInbox]);

  const handleNotifClick = useCallback(
    async (id) => {
      const note = notifications.find((item) => item.id === id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, unread: false } : item)),
      );

      try {
        if (note?.unread) await markAdminInboxItemRead(id);
      } catch (err) {
        console.error("[AdminInbox] mark read failed:", err?.message || err);
      }

      if (note?.href) {
        navigate(note.href);
        return;
      }
      if (note) onToast?.(note.title || "Notification opened");
    },
    [navigate, notifications, onToast],
  );

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
    try {
      await markAllAdminInboxRead();
      onToast?.("All notifications marked as read");
    } catch (err) {
      onToast?.(err?.message || "Could not mark notifications read");
      loadInbox({ silent: true });
    }
  }, [loadInbox, onToast]);

  const handleDismissNotif = useCallback(
    async (id) => {
      const note = notifications.find((item) => item.id === id);
      if (!note) return;

      setNotifications((prev) => prev.filter((item) => item.id !== id));

      try {
        if (note.unread) await markAdminInboxItemRead(id);
      } catch (err) {
        onToast?.(err?.message || "Could not dismiss notification");
        loadInbox({ silent: true });
      }
    },
    [loadInbox, notifications, onToast],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      inboxLoading,
      loadInbox,
      handleNotifClick,
      handleMarkAllRead,
      handleDismissNotif,
    }),
    [
      notifications,
      unreadCount,
      inboxLoading,
      loadInbox,
      handleNotifClick,
      handleMarkAllRead,
      handleDismissNotif,
    ],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used within InboxProvider");
  return ctx;
}
