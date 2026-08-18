import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { NAV_ITEMS, UPDATED_ADMIN_PATHS } from "./data/dashboardData.js";
import {
  fetchAdminInbox,
  markAdminInboxItemRead,
  markAllAdminInboxRead,
} from "./api/adminInboxApi.js";
import { ConfirmDialog } from "./components/ConfirmDialog.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AdminHeader } from "./components/AdminHeader.jsx";
import { AdminSidebar } from "./components/AdminSidebar.jsx";
import { useViewAs } from "./context/ViewAsContext.jsx";
import { useAppSelector } from "./store/hooks.js";
import { selectAppName } from "./store/slices/appConfigSlice.js";
import "./ref-animations.css";
import "./admin.css";

const INBOX_POLL_MS = 60_000;

export function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useViewAs();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutAsk, setLogoutAsk] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  const showToast = useCallback((message) => {
    setToast(message);
    setToastVisible(true);
  }, []);

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

  useEffect(() => {
    if (!notifOpen) return undefined;
    loadInbox({ silent: true });
    return undefined;
  }, [notifOpen, loadInbox]);

  const requestLogout = useCallback(() => {
    setLogoutAsk(true);
  }, []);

  const confirmLogout = useCallback(() => {
    setLogoutAsk(false);
    logout();
    navigate(UPDATED_ADMIN_PATHS.login, { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    if (!toastVisible) return undefined;
    const timer = window.setTimeout(() => setToastVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [toastVisible, toast]);

  const isClientProfile = /^\/users\/[^/]+$/.test(pathname) && pathname !== UPDATED_ADMIN_PATHS.users;
  const appName = useAppSelector(selectAppName);

  useEffect(() => {
    if (isClientProfile) {
      document.title = `${appName} Admin — Client profile`;
      return;
    }
    const active = NAV_ITEMS.find((item) =>
      item.id === "dashboard" ? pathname === item.path : pathname.startsWith(item.path),
    );
    document.title = active
      ? `${appName} Admin — ${active.label}`
      : `${appName} Admin Console`;
  }, [appName, isClientProfile, pathname]);

  useEffect(() => {
    const shell = document.querySelector(".updated-admin .page-shell");
    shell?.scrollTo(0, 0);
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") setMobileNavOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  async function handleNotifClick(id) {
    const note = notifications.find((item) => item.id === id);
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    );
    setNotifOpen(false);

    try {
      if (note?.unread) await markAdminInboxItemRead(id);
    } catch (err) {
      console.error("[AdminInbox] mark read failed:", err?.message || err);
    }

    if (note?.href) {
      navigate(note.href);
      return;
    }
    if (note) showToast(note.title);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
    try {
      await markAllAdminInboxRead();
      showToast("All notifications marked as read");
    } catch (err) {
      showToast(err?.message || "Could not mark notifications read");
      loadInbox({ silent: true });
    }
  }

  return (
    <div className={`updated-admin${isClientProfile ? " updated-admin--client-profile" : ""}`}>
      <AdminSidebar
        onLogout={requestLogout}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="main">
        <AdminHeader
          notifications={notifications}
          unreadCount={unreadCount}
          notifOpen={notifOpen}
          inboxLoading={inboxLoading}
          onToggleNotif={() => setNotifOpen((open) => !open)}
          onCloseNotif={() => setNotifOpen(false)}
          onMarkAllRead={handleMarkAllRead}
          onNotifClick={handleNotifClick}
          onOpenProfile={() => setProfileOpen(true)}
          onLogout={requestLogout}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <div className="page-shell">
          <Outlet context={{ showToast }} />
        </div>
      </div>

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onToast={showToast}
      />

      <ConfirmDialog
        open={logoutAsk}
        tag="Sign out"
        title="Log out of the admin console?"
        body="You’ll need to sign in again to manage teams, users, and access."
        cancelLabel="Stay signed in"
        confirmLabel="Log out"
        onCancel={() => setLogoutAsk(false)}
        onConfirm={confirmLogout}
      />

      <div className={`toast${toastVisible ? " toast--show" : ""}`} role="status" aria-live="polite">
        {toastVisible ? <span className="toast__icon" aria-hidden="true">✓</span> : null}
        <span>{toast}</span>
      </div>
    </div>
  );
}
