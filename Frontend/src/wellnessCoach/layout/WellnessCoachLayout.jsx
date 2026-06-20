import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { coachGetMe } from "../api/coachAuth.js";
import { CoachFooter } from "../components/Footer.jsx";
import { CoachHeader } from "../components/Header.jsx";
import { CoachSidebar } from "../components/Sidebar.jsx";
import { flattenNavLinks, coachNavItems } from "../data/navItems.js";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { logoutCoach, setCoach } from "../../store/authSlice.js";

function titleFromPath(pathname) {
  const p = pathname.replace(/\/$/, "") || "/";
  if (/^\/coach\/profile\/?$/.test(p)) return "Profile";
  if (/^\/coach\/my-assistants\/[^/]+\/edit\/?$/.test(p)) return "Edit assistant";
  if (/^\/coach\/my-assistants\/new\/?$/.test(p)) return "Add assistant";
  if (/^\/coach\/my-assistants\/[^/]+\/?$/.test(p)) return "Assistant details";
  if (/^\/coach\/my-assistants\/?$/.test(p)) return "Assistants (AWC)";
  if (/^\/coach\/my-heal-users\/[^/]+\/water-tracking\/?$/.test(p)) return "Water tracking";
  if (/^\/coach\/my-heal-users\/?$/.test(p)) return "Heal Clients";
  const segment = p.split("/").pop() || "dashboard";
  const found = flattenNavLinks(coachNavItems).find((n) => n.to === segment);
  return found ? found.label : segment.replace(/-/g, " ");
}

export function WellnessCoachLayout() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pageTitle = useMemo(() => titleFromPath(pathname), [pathname]);

  useEffect(() => {
    if (!coachToken) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await coachGetMe(coachToken);
        if (!cancelled && data?.coach) dispatch(setCoach(data.coach));
      } catch (e) {
        if (e?.status === 401) dispatch(logoutCoach());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coachToken, dispatch]);

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

  if (!coachToken) {
    return <Navigate to="/coach/login" replace />;
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
      <CoachSidebar
        id="coach-sidebar"
        drawerOpen={sidebarOpen}
        desktopCollapsed={sidebarCollapsed}
        onNavigate={closeSidebar}
      />

      <div className="admin-main">
        <CoachHeader
          title={pageTitle}
          onMenuClick={toggleSidebar}
          isDesktop={isDesktop}
          mobileNavOpen={sidebarOpen}
          desktopSidebarCollapsed={sidebarCollapsed}
        />
        <main className="admin-content">
          <Outlet />
        </main>
        <CoachFooter />
      </div>
    </div>
  );
}
