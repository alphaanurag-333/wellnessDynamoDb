import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminLoginPage } from "./admin/pages/LoginPage.jsx";
import { NotFoundPage } from "./admin/pages/NotFoundPage.jsx";
import { adminRouteTree } from "./admin/routes/adminRoutes.jsx";
import { CoachRegisterPage } from "./wellnessCoach/pages/RegisterPage.jsx";
import { publicRouteTree } from "./site/routes/publicRoutes.jsx";
import { SiteNotFoundPage } from "./site/pages/SiteNotFoundPage.jsx";
import { selectAppConfigData } from "./store/appConfigSelectors.js";
import { clearAppConfig, fetchAppConfig, fetchPublicAppConfig } from "./store/appConfigSlice.js";
import { mediaUrl } from "./media.js";

function portalTitle(pathname, appName) {
  const name = appName?.trim() || "Wellness";
  if (pathname.startsWith("/admin") || pathname.startsWith("/coach") || pathname.startsWith("/assistant")) {
    return `${name} — Wellness Panel`;
  }
  return name;
}

function AppConfigSync() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const config = useSelector(selectAppConfigData);

  useEffect(() => {
    if (adminToken) {
      dispatch(fetchAppConfig(adminToken));
      return;
    }
    dispatch(clearAppConfig());
    dispatch(fetchPublicAppConfig());
  }, [dispatch, adminToken]);

  useEffect(() => {
    document.title = portalTitle(pathname, config?.app_name);
  }, [config?.app_name, pathname]);

  useEffect(() => {
    const path = config?.favicon?.trim();
    if (!path) return;
    const href = mediaUrl(path);
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [config?.favicon]);

  return null;
}

function CatchAllNotFound() {
  const { pathname } = useLocation();
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/coach") ||
    pathname.startsWith("/assistant")
  ) {
    return <NotFoundPage />;
  }
  return <SiteNotFoundPage />;
}

function LegacyPortalRedirect({ portal }) {
  const { pathname } = useLocation();
  const suffix = pathname.slice(`/${portal}`.length).replace(/^\/+/, "");
  const clientMatch = suffix.match(/^my-users\/([^/]+)(?:\/.*)?$/);
  if (clientMatch) return <Navigate to={`/admin/users/${clientMatch[1]}/hub`} replace />;

  const destinations = {
    dashboard: "/admin/dashboard",
    "my-users": "/admin/users",
    "meal-approvals": "/admin/meal-approvals",
    "my-assistants": "/admin/my-assistants",
  };
  const destination = destinations[suffix] || "/admin/dashboard";
  return <Navigate to={portal === "assistant" && suffix === "my-assistants" ? "/admin/dashboard" : destination} replace />;
}

export default function App() {
  return (
    <>
      <AppConfigSync />
      <Routes>
        {publicRouteTree}
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/coache/*" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/coach-register" element={<CoachRegisterPage />} />
        {adminRouteTree}
        <Route path="/coach/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/assistant/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/coach/register" element={<Navigate to="/admin/coach-register" replace />} />
        <Route path="/coach/*" element={<LegacyPortalRedirect portal="coach" />} />
        <Route path="/assistant/*" element={<LegacyPortalRedirect portal="assistant" />} />
        <Route path="*" element={<CatchAllNotFound />} />
      </Routes>
    </>
  );
}
