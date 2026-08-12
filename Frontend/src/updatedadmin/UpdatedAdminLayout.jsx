import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { INITIAL_NOTIFICATIONS, NAV_ITEMS } from "./data/dashboardData.js";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { UpdatedAdminHeader } from "./components/UpdatedAdminHeader.jsx";
import { UpdatedAdminSidebar } from "./components/UpdatedAdminSidebar.jsx";
import "./ref-animations.css";
import "./updatedadmin.css";

export function UpdatedAdminLayout() {
  const { pathname } = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  useEffect(() => {
    if (!toastVisible) return undefined;
    const timer = window.setTimeout(() => setToastVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [toastVisible, toast]);

  useEffect(() => {
    const clientMatch = pathname.match(/^\/updatedadmin\/users\/(\d+)/);
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
    <div className={`updated-admin${pathname.match(/^\/updatedadmin\/users\/\d+/) ? " updated-admin--client-profile" : ""}`}>
      <UpdatedAdminSidebar onLogout={() => showToast("Logout clicked")} />

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
          onLogout={() => showToast("Logout clicked")}
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

      <div className={`toast${toastVisible ? " toast--show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
