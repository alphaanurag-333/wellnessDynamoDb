import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { staffGetMe } from "../api/staffAuth.js";
import { Footer } from "../../admin/components/Footer.jsx";
import { PanelHeader } from "../components/PanelHeader.jsx";
import { PanelSidebar } from "../components/PanelSidebar.jsx";
import { flattenPanelNavLinks, panelNavItems } from "../data/navConfig.js";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { logoutStaff, setStaffAccount } from "../../store/authSlice.js";
import { selectIsStaffSuperAdmin } from "../../store/staffAuthSelectors.js";
import { canAccessPanelPath, firstAllowedPanelPath } from "../utils/navAccess.js";

function titleFromPath(pathname) {
  const p = pathname.replace(/\/$/, "") || "/";
  if (/^\/panel\/staff-accounts\/new\/?$/.test(p)) return "Add Staff Account";
  if (/^\/panel\/staff-accounts\/[^/]+\/edit\/?$/.test(p)) return "Edit Staff Account";
  if (/^\/panel\/roles\/new\/?$/.test(p)) return "Add Role";
  if (/^\/panel\/roles\/[^/]+\/edit\/?$/.test(p)) return "Edit Role";
  const segment = p.split("/").pop() || "dashboard";
  const found = flattenPanelNavLinks(panelNavItems).find((n) => n.to === segment);
  return found ? found.label : segment.replace(/-/g, " ");
}

export function PanelLayout() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const staffToken = useSelector((s) => s.auth.staffToken);
  const isSuperAdmin = useSelector(selectIsStaffSuperAdmin);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const pageTitle = useMemo(() => titleFromPath(pathname), [pathname]);
  const authContext = useMemo(() => ({ isSuperAdmin }), [isSuperAdmin]);
  const pathAllowed = useMemo(() => canAccessPanelPath(pathname, authContext), [pathname, authContext]);

  useEffect(() => {
    if (!staffToken) return;
    let cancelled = false;
    setAuthReady(false);
    (async () => {
      try {
        const data = await staffGetMe(staffToken);
        // Refreshes isSuperAdmin/roleId/permissions on every navigation, so a
        // permission change made by the Super Admin is reflected without
        // requiring the account to log out and back in.
        if (!cancelled && data?.account) dispatch(setStaffAccount(data.account));
      } catch (e) {
        if (e?.status === 401) dispatch(logoutStaff());
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffToken, dispatch]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onForbidden = (event) => {
      Swal.fire({
        icon: "warning",
        title: "Access denied",
        text: event.detail?.message || "You don't have permission to do that.",
        confirmButtonColor: "#ea580c",
      });
    };
    window.addEventListener("panel:forbidden", onForbidden);
    return () => window.removeEventListener("panel:forbidden", onForbidden);
  }, []);

  const closeSidebar = () => setSidebarOpen(false);

  const toggleSidebar = () => {
    if (isDesktop) {
      setSidebarCollapsed((c) => !c);
      setSidebarOpen(false);
    } else {
      setSidebarOpen((v) => !v);
    }
  };

  if (!staffToken) {
    return <Navigate to="/panel/login" replace />;
  }

  if (authReady && !pathAllowed) {
    return <Navigate to={firstAllowedPanelPath()} replace />;
  }

  return (
    <div
      className={`admin-shell${sidebarOpen ? " admin-shell--nav-open" : ""}${
        sidebarCollapsed ? " admin-shell--sidebar-collapsed" : ""
      }`}
    >
      <button
        type="button"
        className="admin-backdrop"
        aria-label="Close navigation"
        tabIndex={-1}
        onClick={closeSidebar}
      />
      <PanelSidebar
        id="panel-sidebar"
        drawerOpen={sidebarOpen}
        desktopCollapsed={sidebarCollapsed}
        onNavigate={closeSidebar}
      />

      <div className="admin-main">
        <PanelHeader
          title={pageTitle}
          onMenuClick={toggleSidebar}
          isDesktop={isDesktop}
          mobileNavOpen={sidebarOpen}
          desktopSidebarCollapsed={sidebarCollapsed}
        />
        <main className="admin-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
