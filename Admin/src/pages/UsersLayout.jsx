import { Suspense } from "react";
import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { UsersPage } from "./UsersPage.jsx";
import { UserDetailPage } from "./UserDetailPage.jsx";

export { UserDetailPage };

function ProfileSuspenseFallback() {
  return (
    <div className="ua-cp-drawer" role="status" aria-label="Loading client profile">
      <BrandLoader variant="page" label="Loading client…" />
    </div>
  );
}

/** Users list stays mounted; client profile opens as a full-screen drawer overlay. */
export function UsersLayout() {
  const { can } = useViewAs();
  const outletContext = useOutletContext();
  if (!can("console.cl.view")) {
    return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
  }
  return (
    <>
      <UsersPage />
      <Suspense fallback={<ProfileSuspenseFallback />}>
        <Outlet context={outletContext} />
      </Suspense>
    </>
  );
}
