import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { adminGetMe } from "../api/adminAuth.js";
import { Footer } from "../components/Footer.jsx";
import { Header } from "../components/Header.jsx";
import { Sidebar } from "../components/Sidebar.jsx";
import { flattenNavLinks, navItems } from "../data/navItems.js";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { logout, setAdmin } from "../../store/authSlice.js";

function titleFromPath(pathname) {
  const p = pathname.replace(/\/$/, "") || "/";

  if (p.startsWith("/admin/users")) {
    if (/^\/admin\/users\/new$/.test(p)) return "Add User";
    if (/^\/admin\/users\/[^/]+\/edit$/.test(p)) return "Edit User";
    if (/^\/admin\/users\/[^/]+\/water-tracking$/.test(p)) return "Water Tracking";
    if (/^\/admin\/users\/[^/]+$/.test(p)) return "User Details";
    return "User Management";
  }


  if (/^\/admin\/profile\/?$/.test(p)) return "Admin Profile";
  if (/^\/admin\/settings\/?$/.test(p)) return "App Settings";

  if (p.startsWith("/admin/health-concerns")) {
    if (/^\/admin\/health-concerns\/new$/.test(p)) return "Add health concern";
    if (/^\/admin\/health-concerns\/[^/]+\/edit$/.test(p)) return "Edit health concern";
    if (/^\/admin\/health-concerns\/[^/]+$/.test(p)) return "Health concern details";
    return "Health concerns";
  }

  if (p.startsWith("/admin/health-tools")) {
    if (/^\/admin\/health-tools\/new$/.test(p)) return "Add health tool";
    if (/^\/admin\/health-tools\/[^/]+\/edit$/.test(p)) return "Edit health tool";
    if (/^\/admin\/health-tools\/[^/]+$/.test(p)) return "Health tool details";
    return "Health tools";
  }

  if (p.startsWith("/admin/transformations")) {
    if (/^\/admin\/transformations\/new$/.test(p)) return "Add transformation";
    if (/^\/admin\/transformations\/[^/]+\/edit$/.test(p)) return "Edit transformation";
    if (/^\/admin\/transformations\/[^/]+$/.test(p)) return "Transformation details";
    return "Transformations";
  }

  if (p.startsWith("/admin/health-disorders")) {
    if (/^\/admin\/health-disorders\/new$/.test(p)) return "Add health disorder";
    if (/^\/admin\/health-disorders\/[^/]+\/edit$/.test(p)) return "Edit health disorder";
    if (/^\/admin\/health-disorders\/[^/]+$/.test(p)) return "Health disorder details";
    return "Health disorders";
  }

  if (p.startsWith("/admin/yoga")) {
    if (/^\/admin\/yoga\/new$/.test(p)) return "Add yoga";
    if (/^\/admin\/yoga\/[^/]+\/edit$/.test(p)) return "Edit yoga";
    if (/^\/admin\/yoga\/[^/]+$/.test(p)) return "Yoga details";
    return "Yoga";
  }

  if (p.startsWith("/admin/client-testimonials")) {
    if (/^\/admin\/client-testimonials\/new$/.test(p)) return "Add client testimonial";
    if (/^\/admin\/client-testimonials\/[^/]+\/edit$/.test(p)) return "Edit client testimonial";
    if (/^\/admin\/client-testimonials\/[^/]+$/.test(p)) return "Client testimonial details";
    return "Client testimonials";
  }

  if (p.startsWith("/admin/video-testimonials")) {
    if (/^\/admin\/video-testimonials\/new$/.test(p)) return "Add video testimonial";
    if (/^\/admin\/video-testimonials\/[^/]+\/edit$/.test(p)) return "Edit video testimonial";
    if (/^\/admin\/video-testimonials\/[^/]+$/.test(p)) return "Video testimonial details";
    return "Video testimonials";
  }

  if (p.startsWith("/admin/health-recipes")) {
    if (/^\/admin\/health-recipes\/new$/.test(p)) return "Add health recipe";
    if (/^\/admin\/health-recipes\/[^/]+\/edit$/.test(p)) return "Edit health recipe";
    if (/^\/admin\/health-recipes\/[^/]+$/.test(p)) return "Health recipe details";
    return "Health recipes";
  }

  if (p.startsWith("/admin/banners")) {
    if (/^\/admin\/banners\/new$/.test(p)) return "Add banner";
    if (/^\/admin\/banners\/[^/]+\/edit$/.test(p)) return "Edit banner";
    if (/^\/admin\/banners\/[^/]+$/.test(p)) return "Banner details";
    return "Banners";
  }

  if (p.startsWith("/admin/notifications")) {
    if (/^\/admin\/notifications\/new$/.test(p)) return "Add notification";
    if (/^\/admin\/notifications\/[^/]+\/edit$/.test(p)) return "Edit notification";
    if (/^\/admin\/notifications\/[^/]+$/.test(p)) return "Notification details";
    return "Notifications";
  }

  if (p.startsWith("/admin/celebration-banners")) {
    if (/^\/admin\/celebration-banners\/new$/.test(p)) return "Add celebration banner";
    if (/^\/admin\/celebration-banners\/[^/]+\/edit$/.test(p)) return "Edit celebration banner";
    if (/^\/admin\/celebration-banners\/[^/]+$/.test(p)) return "Celebration banner details";
    return "Celebration banners";
  }

  if (p.startsWith("/admin/coupons")) {
    if (/^\/admin\/coupons\/new$/.test(p)) return "Add coupon";
    if (/^\/admin\/coupons\/[^/]+\/edit$/.test(p)) return "Edit coupon";
    if (/^\/admin\/coupons\/[^/]+$/.test(p)) return "Coupon details";
    return "Coupons";
  }

  if (p.startsWith("/admin/specializations")) {
    if (/^\/admin\/specializations\/new$/.test(p)) return "Add specialization";
    if (/^\/admin\/specializations\/[^/]+\/edit$/.test(p)) return "Edit specialization";
    if (/^\/admin\/specializations\/[^/]+$/.test(p)) return "Specialization details";
    return "Specializations";
  }

  if (p.startsWith("/admin/faq")) {
    if (/^\/admin\/faq\/new$/.test(p)) return "Add FAQ";
    if (/^\/admin\/faq\/[^/]+\/edit$/.test(p)) return "Edit FAQ";
    if (/^\/admin\/faq\/[^/]+$/.test(p)) return "FAQ details";
    return "FAQ";
  }

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
    return <Navigate to="/admin/login" replace />;
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
