import { Outlet, useOutletContext } from "react-router-dom";
import { UsersPage } from "./UsersPage.jsx";

/** Users list stays mounted; client profile opens as a full-screen drawer overlay (ref HTML). */
export function UsersLayout() {
  const outletContext = useOutletContext();
  return (
    <>
      <UsersPage />
      <Outlet context={outletContext} />
    </>
  );
}
