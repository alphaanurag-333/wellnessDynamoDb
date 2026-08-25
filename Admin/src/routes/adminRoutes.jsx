import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route } from "react-router-dom";
import { AppConfigBrandingSync } from "../components/AppConfigBrandingSync.jsx";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { ViewAsProvider, useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { AdminLoginPage } from "../pages/AdminLoginPage.jsx";

function lazyNamed(importer, exportName) {
  return lazy(() => importer().then((mod) => ({ default: mod[exportName] })));
}

const AdminLayout = lazyNamed(() => import("../AdminLayout.jsx"), "AdminLayout");
const AccessPage = lazyNamed(() => import("../pages/AccessPage.jsx"), "AccessPage");
const CalendarPage = lazyNamed(() => import("../pages/CalendarPage.jsx"), "CalendarPage");
const ConfigsPage = lazyNamed(() => import("../pages/ConfigsPage.jsx"), "ConfigsPage");
const ConfigDetailPage = lazyNamed(() => import("../pages/ConfigDetailPage.jsx"), "ConfigDetailPage");
const DashboardPage = lazyNamed(() => import("../pages/DashboardPage.jsx"), "DashboardPage");
const PendingPage = lazyNamed(() => import("../pages/PendingPage.jsx"), "PendingPage");
const SopPage = lazyNamed(() => import("../pages/SopPage.jsx"), "SopPage");
const TeamsPage = lazyNamed(() => import("../pages/TeamsPage.jsx"), "TeamsPage");
const TeamMemberPage = lazyNamed(() => import("../pages/TeamMemberPage.jsx"), "TeamMemberPage");
const MyContentPage = lazyNamed(() => import("../pages/MyContentPage.jsx"), "MyContentPage");
const CommitmentLettersPage = lazyNamed(
  () => import("../pages/CommitmentLettersPage.jsx"),
  "CommitmentLettersPage",
);
const AdminNotFoundPage = lazyNamed(() => import("../pages/AdminNotFoundPage.jsx"), "AdminNotFoundPage");
const UsersLayout = lazyNamed(() => import("../pages/UsersLayout.jsx"), "UsersLayout");
const UserDetailPage = lazyNamed(() => import("../pages/UserDetailPage.jsx"), "UserDetailPage");
const NotificationsPage = lazyNamed(() => import("../pages/NotificationsPage.jsx"), "NotificationsPage");
const ContactInquiriesPage = lazyNamed(
  () => import("../pages/ContactInquiriesPage.jsx"),
  "ContactInquiriesPage",
);
const ReferralTreePage = lazyNamed(() => import("../pages/ReferralTreePage.jsx"), "ReferralTreePage");

function AdminRoot() {
  return (
    <ViewAsProvider>
      <AppConfigBrandingSync />
      <Outlet />
    </ViewAsProvider>
  );
}

function ProtectedShell() {
  const { isAuthenticated, bootstrapping } = useViewAs();

  if (bootstrapping) {
    return <BrandLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={UPDATED_ADMIN_PATHS.login} replace />;
  }

  return (
    <Suspense fallback={<BrandLoader />}>
      <AdminLayout />
    </Suspense>
  );
}

export const adminRouteTree = (
  <Route element={<AdminRoot />}>
    <Route path="login" element={<AdminLoginPage />} />
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
      <Route path="configs/:configId" element={<ConfigDetailPage />} />
      <Route path="pending" element={<PendingPage />} />
      <Route path="sop" element={<SopPage />} />
      <Route path="contact-inquiries" element={<ContactInquiriesPage />} />
      <Route path="referral-tree" element={<ReferralTreePage />} />
      <Route path="my-content" element={<MyContentPage />} />
      <Route path="my-content/letters/:coachId" element={<CommitmentLettersPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="*" element={<AdminNotFoundPage />} />
    </Route>
  </Route>
);
