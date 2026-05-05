import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Route, Routes } from "react-router-dom";
import { RootRedirect } from "./components/RootRedirect.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import { adminRouteTree } from "./routes/adminRoutes.jsx";
import { selectAppConfigData } from "./store/appConfigSelectors.js";
import { clearAppConfig, fetchAppConfig, fetchPublicAppConfig } from "./store/appConfigSlice.js";
import { mediaUrl } from "./media.js";

function AppConfigSync() {
  const dispatch = useDispatch();
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
    const name = config?.app_name?.trim();
    document.title = name ? `${name} — Admin` : "Admin";
  }, [config?.app_name]);

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
        <Route path="/login" element={<LoginPage />} />
        {adminRouteTree}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
