import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchAdminInbox,
  markAdminInboxItemRead,
  markAllAdminInboxRead,
} from "../api/adminInboxApi.js";

const INBOX_POLL_MS = 60_000;

const InboxContext = createContext(null);

export function InboxProvider({ children, onToast }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  const loadInbox = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setInboxLoading(true);
    try {
      const data = await fetchAdminInbox({ page: 1, limit: 40 });
      setNotifications(data?.notifications || []);
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
    const timer = window.setInterval(() => loadInbox({ silent: true }), INBOX_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadInbox]);

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

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      inboxLoading,
      loadInbox,
      handleNotifClick,
      handleMarkAllRead,
    }),
    [
      notifications,
      unreadCount,
      inboxLoading,
      loadInbox,
      handleNotifClick,
      handleMarkAllRead,
    ],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used within InboxProvider");
  return ctx;
}
