import { Navigate, Outlet, Route } from "react-router-dom";
import { AdminLayout } from "../AdminLayout.jsx";
import { ViewAsProvider, useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { AccessPage } from "../pages/AccessPage.jsx";
import { CalendarPage } from "../pages/CalendarPage.jsx";
import { ConfigsPage } from "../pages/ConfigsPage.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { PendingPage } from "../pages/PendingPage.jsx";
import { SopPage } from "../pages/SopPage.jsx";
import { TeamsPage } from "../pages/TeamsPage.jsx";
import { TeamMemberPage } from "../pages/TeamMemberPage.jsx";
import { MyContentPage } from "../pages/MyContentPage.jsx";
import { CommitmentLettersPage } from "../pages/CommitmentLettersPage.jsx";
import { UpdatedAdminNotFoundPage } from "../pages/UpdatedAdminNotFoundPage.jsx";
import { UsersLayout } from "../pages/UsersLayout.jsx";
import { UserDetailPage } from "../pages/UserDetailPage.jsx";
import { UpdatedAdminLoginPage } from "../pages/UpdatedAdminLoginPage.jsx";

function AdminRoot() {
  return (
    <ViewAsProvider>
      <Outlet />
    </ViewAsProvider>
  );
}

function ProtectedShell() {
  const { isAuthenticated, bootstrapping } = useViewAs();

  if (bootstrapping) {
    return (
      <div className="updated-admin" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <p>Loading session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={UPDATED_ADMIN_PATHS.login} replace />;
  }

  return <AdminLayout />;
}

export const adminRouteTree = (
  <Route element={<AdminRoot />}>
    <Route path="login" element={<UpdatedAdminLoginPage />} />
    <Route element={<ProtectedShell />}>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="users" element={<UsersLayout />}>
        <Route path=":userId" element={<UserDetailPage />} />
      </Route>
      <Route path="access" element={<AccessPage />} />
      <Route path="teams" element={<TeamsPage />} />
      <Route path="teams/:memberId" element={<TeamMemberPage />} />
      <Route path="calendar" element={<CalendarPage />} />
      <Route path="configs" element={<ConfigsPage />} />
      <Route path="pending" element={<PendingPage />} />
      <Route path="sop" element={<SopPage />} />
      <Route path="my-content" element={<MyContentPage />} />
      <Route path="my-content/letters/:coachId" element={<CommitmentLettersPage />} />
      <Route path="*" element={<UpdatedAdminNotFoundPage />} />
    </Route>
  </Route>
);
