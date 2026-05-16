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
import { HealthToolPage } from "../pages/healthTool/HealthTool.jsx";
import { HealthRecipeList } from "../pages/healthRecipe/HealthRecipeList.jsx";
import { HealthRecipeAdd } from "../pages/healthRecipe/HealthRecipeAdd.jsx";
import { HealthRecipeEdit } from "../pages/healthRecipe/HealthRecipeEdit.jsx";
import { HealthRecipeView } from "../pages/healthRecipe/HealthRecipeView.jsx";
import { HealthDisorderList } from "../pages/healthDisorder/HealthDisorderList.jsx";
import { HealthDisorderAdd } from "../pages/healthDisorder/HealthDisorderAdd.jsx";
import { HealthDisorderEdit } from "../pages/healthDisorder/HealthDisorderEdit.jsx";
import { HealthDisorderView } from "../pages/healthDisorder/HealthDisorderView.jsx";
import { YogaList } from "../pages/yoga/YogaList.jsx";
import { YogaAdd } from "../pages/yoga/YogaAdd.jsx";
import { YogaEdit } from "../pages/yoga/YogaEdit.jsx";
import { YogaView } from "../pages/yoga/YogaView.jsx";
import { TransformationPage } from "../pages/transformation/TransformationPage.jsx";
import { CelebrationBannerPage } from "../pages/celebrationBanner/celebrationBanner.jsx";
import { ClientTestimonialPage } from "../pages/clientTestimonial/ClientTestimonial.jsx";
import { VideoTestimonialPage } from "../pages/videoTestimonial/VideoTestimonial.jsx";
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
    <Route path="health-tools" element={<HealthToolPage />} />
    <Route path="health-recipes" element={<Outlet />}>
      <Route index element={<HealthRecipeList />} />
      <Route path="new" element={<HealthRecipeAdd />} />
      <Route path=":recipeId/edit" element={<HealthRecipeEdit />} />
      <Route path=":recipeId" element={<HealthRecipeView />} />
    </Route>
    <Route path="health-disorders" element={<Outlet />}>
      <Route index element={<HealthDisorderList />} />
      <Route path="new" element={<HealthDisorderAdd />} />
      <Route path=":disorderId/edit" element={<HealthDisorderEdit />} />
      <Route path=":disorderId" element={<HealthDisorderView />} />
    </Route>
    <Route path="yoga" element={<Outlet />}>
      <Route index element={<YogaList />} />
      <Route path="new" element={<YogaAdd />} />
      <Route path=":yogaId/edit" element={<YogaEdit />} />
      <Route path=":yogaId" element={<YogaView />} />
    </Route>
    <Route path="transformations" element={<TransformationPage />} />
    <Route path="faq" element={<FaqPage />} />
    <Route path="notifications" element={<NotificationPage />} />
    <Route path="celebration-banners" element={<CelebrationBannerPage />} />
    <Route path="client-testimonials" element={<ClientTestimonialPage />} />
    <Route path="video-testimonials" element={<VideoTestimonialPage />} />

    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
