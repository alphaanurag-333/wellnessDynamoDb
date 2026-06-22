import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { assistantGetMe } from "../api/assistantAuth.js";
import { AssistantFooter } from "../components/Footer.jsx";
import { AssistantHeader } from "../components/Header.jsx";
import { AssistantSidebar } from "../components/Sidebar.jsx";
import { flattenNavLinks, assistantNavItems } from "../data/navItems.js";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { logoutAssistant, setAssistant } from "../../store/authSlice.js";

function titleFromPath(pathname) {
  const p = pathname.replace(/\/$/, "") || "/";
  if (/^\/assistant\/profile\/?$/.test(p)) return "Profile";
  if (/^\/assistant\/my-users\/[^/]+\/water-tracking\/?$/.test(p)) return "Water tracking";
  if (/^\/assistant\/my-users\/[^/]+\/steps-tracking\/?$/.test(p)) return "Steps tracking";
  if (/^\/assistant\/my-users\/?$/.test(p)) return "My Clients";
  if (/^\/assistant\/consultancy\/enrolled-users\/?$/.test(p)) return "Consultancy Enrolled Users";
  if (/^\/assistant\/consultancy\/transactions\/?$/.test(p)) return "Consultancy Transactions";
  const segment = p.split("/").pop() || "dashboard";
  const found = flattenNavLinks(assistantNavItems).find((n) => n.to === segment);
  return found ? found.label : segment.replace(/-/g, " ");
}

export function AssistantWellnessCoachLayout() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pageTitle = useMemo(() => titleFromPath(pathname), [pathname]);

  useEffect(() => {
    if (!assistantToken) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await assistantGetMe(assistantToken);
        if (!cancelled && data?.assistant) dispatch(setAssistant(data.assistant));
      } catch (e) {
        if (e?.status === 401) dispatch(logoutAssistant());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assistantToken, dispatch]);

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

  if (!assistantToken) {
    return <Navigate to="/assistant/login" replace />;
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
      <AssistantSidebar
        id="assistant-sidebar"
        drawerOpen={sidebarOpen}
        desktopCollapsed={sidebarCollapsed}
        onNavigate={closeSidebar}
      />

      <div className="admin-main">
        <AssistantHeader
          title={pageTitle}
          onMenuClick={toggleSidebar}
          isDesktop={isDesktop}
          mobileNavOpen={sidebarOpen}
          desktopSidebarCollapsed={sidebarCollapsed}
        />
        <main className="admin-content">
          <Outlet />
        </main>
        <AssistantFooter />
      </div>
    </div>
  );
}
