import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { INITIAL_NOTIFICATIONS, NAV_ITEMS, UPDATED_ADMIN_PATHS } from "./data/dashboardData.js";
import { ConfirmDialog } from "./components/ConfirmDialog.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { UpdatedAdminHeader } from "./components/UpdatedAdminHeader.jsx";
import { UpdatedAdminSidebar } from "./components/UpdatedAdminSidebar.jsx";
import { useViewAs } from "./context/ViewAsContext.jsx";
import "./ref-animations.css";
import "./admin.css";

export function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, account } = useViewAs();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutAsk, setLogoutAsk] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  const showToast = useCallback((message) => {
    setToast(message);
    setToastVisible(true);
  }, []);

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

  useEffect(() => {
    const clientMatch = pathname.match(/^\/users\/(\d+)/);
    if (clientMatch) {
      document.title = "IR Wellness Admin — Client profile";
      return;
    }
    const active = NAV_ITEMS.find((item) =>
      item.id === "dashboard" ? pathname === item.path : pathname.startsWith(item.path),
    );
    document.title = active
      ? `IR Wellness Admin — ${active.label}`
      : "IR Wellness Admin Console";
  }, [pathname]);

  useEffect(() => {
    const shell = document.querySelector(".updated-admin .page-shell");
    shell?.scrollTo(0, 0);
  }, [pathname]);

  function handleNotifClick(id) {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    );
    const note = notifications.find((item) => item.id === id);
    if (note) showToast(note.title);
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
    showToast("All notifications marked as read");
  }

  return (
    <div className={`updated-admin${pathname.match(/^\/users\/\d+/) ? " updated-admin--client-profile" : ""}`}>
      <UpdatedAdminSidebar onLogout={requestLogout} />

      <div className="main">
        <UpdatedAdminHeader
          notifications={notifications}
          unreadCount={unreadCount}
          notifOpen={notifOpen}
          onToggleNotif={() => setNotifOpen((open) => !open)}
          onCloseNotif={() => setNotifOpen(false)}
          onMarkAllRead={handleMarkAllRead}
          onNotifClick={handleNotifClick}
          onOpenProfile={() => setProfileOpen(true)}
          onLogout={requestLogout}
          accountName={account?.name}
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
