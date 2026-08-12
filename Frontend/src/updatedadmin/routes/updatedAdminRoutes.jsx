import { Route } from "react-router-dom";
import { UpdatedAdminLayout } from "../UpdatedAdminLayout.jsx";
import { AccessPage } from "../pages/AccessPage.jsx";
import { CalendarPage } from "../pages/CalendarPage.jsx";
import { ConfigsPage } from "../pages/ConfigsPage.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { PendingPage } from "../pages/PendingPage.jsx";
import { SopPage } from "../pages/SopPage.jsx";
import { TeamsPage } from "../pages/TeamsPage.jsx";
import { UpdatedAdminNotFoundPage } from "../pages/UpdatedAdminNotFoundPage.jsx";
import { UsersLayout } from "../pages/UsersLayout.jsx";
import { UserDetailPage } from "../pages/UserDetailPage.jsx";

export const updatedAdminRouteTree = (
  <Route path="/updatedadmin" element={<UpdatedAdminLayout />}>
    <Route index element={<DashboardPage />} />
    <Route path="users" element={<UsersLayout />}>
      <Route path=":userId" element={<UserDetailPage />} />
    </Route>
    <Route path="access" element={<AccessPage />} />
    <Route path="teams" element={<TeamsPage />} />
    <Route path="calendar" element={<CalendarPage />} />
    <Route path="configs" element={<ConfigsPage />} />
    <Route path="pending" element={<PendingPage />} />
    <Route path="sop" element={<SopPage />} />
    <Route path="*" element={<UpdatedAdminNotFoundPage />} />
  </Route>
);
