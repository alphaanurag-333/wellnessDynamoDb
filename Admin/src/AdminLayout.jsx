import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { NAV_ITEMS, UPDATED_ADMIN_PATHS } from "./data/dashboardData.js";
import { ConfirmDialog } from "./components/ConfirmDialog.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AdminHeader } from "./components/AdminHeader.jsx";
import { AdminSidebar } from "./components/AdminSidebar.jsx";
import { InboxProvider } from "./context/InboxContext.jsx";
import { useViewAs } from "./context/ViewAsContext.jsx";
import { useAppSelector } from "./store/hooks.js";
import { selectAppName } from "./store/slices/appConfigSlice.js";
import { installAdminDateLimits } from "./utils/adminDateLimits.js";
import "./ref-animations.css";
import "./admin.css";
import "./styles/counsellingSection.css";

export function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useViewAs();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutAsk, setLogoutAsk] = useState(false);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  useEffect(() => installAdminDateLimits(document), []);

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

  return (
    <InboxProvider onToast={showToast}>
      <div className={`updated-admin${isClientProfile ? " updated-admin--client-profile" : ""}`}>
        <AdminSidebar
          onLogout={requestLogout}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <div className="main">
          <AdminHeader
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
    </InboxProvider>
  );
}
