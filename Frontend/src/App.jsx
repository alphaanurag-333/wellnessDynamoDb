import { useEffect, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";
import { publicRouteTree } from "./site/routes/publicRoutes.jsx";
import { selectAppConfigData } from "./store/appConfigSelectors.js";
import { fetchPublicAppConfig } from "./store/appConfigSlice.js";
import { mediaUrl } from "./media.js";
import { SiteLoader } from "./site/components/SiteLoader.jsx";

const SiteNotFoundPage = lazy(() =>
  import("./site/pages/SiteNotFoundPage.jsx").then((mod) => ({ default: mod.SiteNotFoundPage })),
);

function AppConfigSync() {
  const dispatch = useDispatch();
  const config = useSelector(selectAppConfigData);

  useEffect(() => {
    dispatch(fetchPublicAppConfig());
  }, [dispatch]);

  useEffect(() => {
    const name = config?.app_name?.trim() || "Wellness";
    document.title = name;
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
      <Suspense fallback={<SiteLoader variant="overlay" />}>
        <Routes>
          {publicRouteTree}
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/admin/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<SiteNotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
