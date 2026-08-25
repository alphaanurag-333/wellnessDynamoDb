import { Suspense } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { UsersPage } from "./UsersPage.jsx";

/** Users list stays mounted; client profile opens as a full-screen drawer overlay (ref HTML). */
export function UsersLayout() {
  const outletContext = useOutletContext();
  return (
    <>
      <UsersPage />
      <Suspense fallback={<BrandLoader variant="page" label="Loading client…" />}>
        <Outlet context={outletContext} />
      </Suspense>
    </>
  );
}
