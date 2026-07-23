import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminLoginPage } from "./admin/pages/LoginPage.jsx";
import { NotFoundPage } from "./admin/pages/NotFoundPage.jsx";
import { adminRouteTree } from "./admin/routes/adminRoutes.jsx";
import { CoachLoginPage } from "./wellnessCoach/pages/LoginPage.jsx";
import { CoachRegisterPage } from "./wellnessCoach/pages/RegisterPage.jsx";
import { wellnessCoachRouteTree } from "./wellnessCoach/routes/wellnessCoachRoutes.jsx";
import { publicRouteTree } from "./site/routes/publicRoutes.jsx";
import { SiteNotFoundPage } from "./site/pages/SiteNotFoundPage.jsx";
import { selectAppConfigData } from "./store/appConfigSelectors.js";
import { clearAppConfig, fetchAppConfig, fetchPublicAppConfig } from "./store/appConfigSlice.js";
import { mediaUrl } from "./media.js";

function portalTitle(pathname, appName) {
  const name = appName?.trim() || "Wellness";
  if (pathname.startsWith("/coach")) return `${name} — Coach`;
  if (pathname.startsWith("/admin")) return `${name} — Admin`;
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
  if (pathname.startsWith("/admin") || pathname.startsWith("/coach")) {
    return <NotFoundPage />;
  }
  return <SiteNotFoundPage />;
}

export default function App() {
  return (
    <>
      <AppConfigSync />
      <Routes>
        {publicRouteTree}
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        {adminRouteTree}
        <Route path="/coach/login" element={<CoachLoginPage />} />
        <Route path="/coach/register" element={<CoachRegisterPage />} />
        {wellnessCoachRouteTree}
        <Route path="*" element={<CatchAllNotFound />} />
      </Routes>
    </>
  );
}
