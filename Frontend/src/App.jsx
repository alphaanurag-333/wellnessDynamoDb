import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RootRedirect } from "./admin/components/RootRedirect.jsx";
import { AdminLoginPage } from "./admin/pages/LoginPage.jsx";
import { NotFoundPage } from "./admin/pages/NotFoundPage.jsx";
import { adminRouteTree } from "./admin/routes/adminRoutes.jsx";
import { AssistantLoginPage } from "./assistantWellnessCoach/pages/LoginPage.jsx";
import { assistantWellnessCoachRouteTree } from "./assistantWellnessCoach/routes/assistantWellnessCoachRoutes.jsx";
import { CoachLoginPage } from "./wellnessCoach/pages/LoginPage.jsx";
import { wellnessCoachRouteTree } from "./wellnessCoach/routes/wellnessCoachRoutes.jsx";
import { selectAppConfigData } from "./store/appConfigSelectors.js";
import { clearAppConfig, fetchAppConfig, fetchPublicAppConfig } from "./store/appConfigSlice.js";
import { mediaUrl } from "./media.js";

function portalTitle(pathname, appName) {
  const name = appName?.trim() || "Wellness";
  if (pathname.startsWith("/coach")) return `${name} — Coach`;
  if (pathname.startsWith("/assistant")) return `${name} — Assistant`;
  return `${name} — Admin`;
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

export default function App() {
  return (
    <>
      <AppConfigSync />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        {adminRouteTree}
        <Route path="/coach/login" element={<CoachLoginPage />} />
        {wellnessCoachRouteTree}
        <Route path="/assistant/login" element={<AssistantLoginPage />} />
        {assistantWellnessCoachRouteTree}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
