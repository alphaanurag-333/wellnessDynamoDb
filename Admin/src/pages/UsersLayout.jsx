import { Suspense } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
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
  const outletContext = useOutletContext();
  return (
    <>
      <UsersPage />
      <Suspense fallback={<ProfileSuspenseFallback />}>
        <Outlet context={outletContext} />
      </Suspense>
    </>
  );
}
