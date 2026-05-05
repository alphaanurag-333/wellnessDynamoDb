import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { adminGetMe } from "../api/adminAuth.js";
import { Footer } from "../components/Footer.jsx";
import { Header } from "../components/Header.jsx";
import { Sidebar } from "../components/Sidebar.jsx";
import { flattenNavLinks, navItems } from "../data/navItems.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { logout, setAdmin } from "../store/authSlice.js";

function titleFromPath(pathname) {
  const p = pathname.replace(/\/$/, "") || "/";

  if (p.startsWith("/admin/users")) {
    if (/^\/admin\/users\/new$/.test(p)) return "Add User";
    if (/^\/admin\/users\/[^/]+\/edit$/.test(p)) return "Edit User";
    if (/^\/admin\/users\/[^/]+$/.test(p)) return "User Details";
    return "User Management";
  }


  if (/^\/admin\/profile\/?$/.test(p)) return "Admin Profile";
  if (/^\/admin\/settings\/?$/.test(p)) return "App Settings";

  if (/^\/admin\/health-concerns\/?$/.test(p)) return "Health concerns";
  if (/^\/admin\/transformations\/?$/.test(p)) return "Transformations";

  if (p.startsWith("/admin/static-pages")) {
    if (/^\/admin\/static-pages\/[^/]+\/edit\/?$/.test(p)) return "Edit static page";
    return "Static Pages";
  }

  const segment = p.split("/").pop() || "dashboard";
  const found = flattenNavLinks(navItems).find((n) => n.to === segment);
  return found ? found.label : segment.replace(/-/g, " ");
}

export function AdminLayout() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pageTitle = useMemo(() => titleFromPath(pathname), [pathname]);

  useEffect(() => {
    if (!adminToken) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetMe(adminToken);
        if (!cancelled && data?.user) dispatch(setAdmin(data.user));
      } catch (e) {
        if (e?.status === 401) dispatch(logout());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch]);

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

  const closeSidebar = () => setSidebarOpen(false);

  const toggleSidebar = () => {
    if (isDesktop) {
      setSidebarCollapsed((c) => !c);
      setSidebarOpen(false);
    } else {
      setSidebarOpen((v) => !v);
    }
  };

  if (!adminToken) {
    return <Navigate to="/login" replace />;
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
      <Sidebar
        id="admin-sidebar"
        drawerOpen={sidebarOpen}
        desktopCollapsed={sidebarCollapsed}
        onNavigate={closeSidebar}
      />

      <div className="admin-main">
        <Header
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
