import { Route, Navigate, Outlet } from "react-router-dom";
import { AdminLayout } from "../layout/AdminLayout.jsx";
import { AdminProfile } from "../pages/AdminProfile.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { NotFoundPage } from "../pages/NotFoundPage.jsx";
import { BusinessSetting } from "../pages/setting/BusinessSetting.jsx";
import { BannerPage } from "../pages/banners/BannerPage.jsx";
import { FaqPage } from "../pages/faq/Faq.jsx";
import { StaticPageList } from "../pages/static-pages/StaticPageList.jsx";
import { StaticPageUpdate } from "../pages/static-pages/StaticPageUpdate.jsx";
import { NotificationPage } from "../pages/notification/Notification.jsx";
import { HealthConcernPage } from "../pages/healthConcern/HealthConcernPage.jsx";
import { TransformationPage } from "../pages/transformation/TransformationPage.jsx";
import {SectionPage} from "../pages/SectionPage.jsx";
import { UserAdd } from "../pages/user/UserAdd.jsx";
import { UserEdit } from "../pages/user/UserEdit.jsx";
import { UserList } from "../pages/user/UserList.jsx";
import { UserView } from "../pages/user/UserView.jsx";

export const adminRouteTree = (
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<DashboardPage />} />
    <Route path="profile" element={<AdminProfile />} />
    <Route path="settings" element={<BusinessSetting />} />

    <Route path="static-pages" element={<Outlet />}>
      <Route index element={<StaticPageList />} />
      <Route path=":pageId/edit" element={<StaticPageUpdate />} />
    </Route>

    <Route path="users" element={<Outlet />}>
      <Route index element={<UserList />} />
      <Route path="new" element={<UserAdd />} />
      <Route path=":userId/edit" element={<UserEdit />} />
      <Route path=":userId" element={<UserView />} />
    </Route>
    <Route path="programs" element={<SectionPage title="Programs" />} />
    <Route path="coaches" element={<SectionPage title="Coaches" />} />
    <Route path="awcs" element={<SectionPage title="AWCs" />} />
    <Route path="nutrition-plans" element={<SectionPage title="Nutrition Plans" />} />
    <Route path="support-tickets" element={<SectionPage title="Support Tickets" />} />
    <Route path="camp-events" element={<SectionPage title="Camp Events" />} />
    <Route path="program-completions" element={<SectionPage title="Program Completions" />} />

    <Route path="banners" element={<BannerPage />} />
    <Route path="health-concerns" element={<HealthConcernPage />} />
    <Route path="transformations" element={<TransformationPage />} />
    <Route path="faq" element={<FaqPage />} />
    <Route path="notifications" element={<NotificationPage />} />

    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
