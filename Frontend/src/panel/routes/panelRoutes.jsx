import { Route } from "react-router-dom";
import { PanelLayout } from "../layout/PanelLayout.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { ProfilePage } from "../pages/ProfilePage.jsx";
import { RolesPage } from "../pages/RolesPage.jsx";
import { StaffAccountsPage } from "../pages/StaffAccountsPage.jsx";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";

/**
 * Unified Staff RBAC Panel (M7) — mounted at `/panel/*` alongside (not
 * replacing) `/admin`, `/coach`, `/assistant`. See `Backend/docs/DATABASE_OPTIMIZATION.md`
 * migration plan, M7-M9. Feature pages migrate here incrementally; today this
 * covers auth, profile, and the RBAC core (Staff Accounts + Roles &
 * Permissions) that unblocks the "one panel, one role system" ask.
 */
export const panelRouteTree = (
  <Route path="/panel" element={<PanelLayout />}>
    <Route path="dashboard" element={<DashboardPage />} />
    <Route path="profile" element={<ProfilePage />} />
    <Route path="staff-accounts" element={<StaffAccountsPage />} />
    <Route path="roles" element={<RolesPage />} />
    <Route index element={<DashboardPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
