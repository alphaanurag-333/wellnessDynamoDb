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
import { HealthConcernList } from "../pages/healthConcern/HealthConcernList.jsx";
import { HealthConcernAdd } from "../pages/healthConcern/HealthConcernAdd.jsx";
import { HealthConcernEdit } from "../pages/healthConcern/HealthConcernEdit.jsx";
import { HealthConcernView } from "../pages/healthConcern/HealthConcernView.jsx";
import { HealthToolList } from "../pages/healthTool/HealthToolList.jsx";
import { HealthToolAdd } from "../pages/healthTool/HealthToolAdd.jsx";
import { HealthToolEdit } from "../pages/healthTool/HealthToolEdit.jsx";
import { HealthToolView } from "../pages/healthTool/HealthToolView.jsx";
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
import { TransformationList } from "../pages/transformation/TransformationList.jsx";
import { TransformationAdd } from "../pages/transformation/TransformationAdd.jsx";
import { TransformationEdit } from "../pages/transformation/TransformationEdit.jsx";
import { TransformationView } from "../pages/transformation/TransformationView.jsx";
import { CelebrationBannerPage } from "../pages/celebrationBanner/celebrationBanner.jsx";
import { ClientTestimonialList } from "../pages/clientTestimonial/ClientTestimonialList.jsx";
import { ClientTestimonialAdd } from "../pages/clientTestimonial/ClientTestimonialAdd.jsx";
import { ClientTestimonialEdit } from "../pages/clientTestimonial/ClientTestimonialEdit.jsx";
import { ClientTestimonialView } from "../pages/clientTestimonial/ClientTestimonialView.jsx";
import { VideoTestimonialList } from "../pages/videoTestimonial/VideoTestimonialList.jsx";
import { VideoTestimonialAdd } from "../pages/videoTestimonial/VideoTestimonialAdd.jsx";
import { VideoTestimonialEdit } from "../pages/videoTestimonial/VideoTestimonialEdit.jsx";
import { VideoTestimonialView } from "../pages/videoTestimonial/VideoTestimonialView.jsx";
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
    <Route path="health-concerns" element={<Outlet />}>
      <Route index element={<HealthConcernList />} />
      <Route path="new" element={<HealthConcernAdd />} />
      <Route path=":concernId/edit" element={<HealthConcernEdit />} />
      <Route path=":concernId" element={<HealthConcernView />} />
    </Route>
    <Route path="health-tools" element={<Outlet />}>
      <Route index element={<HealthToolList />} />
      <Route path="new" element={<HealthToolAdd />} />
      <Route path=":toolId/edit" element={<HealthToolEdit />} />
      <Route path=":toolId" element={<HealthToolView />} />
    </Route>
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
    <Route path="transformations" element={<Outlet />}>
      <Route index element={<TransformationList />} />
      <Route path="new" element={<TransformationAdd />} />
      <Route path=":transformationId/edit" element={<TransformationEdit />} />
      <Route path=":transformationId" element={<TransformationView />} />
    </Route>
    <Route path="faq" element={<FaqPage />} />
    <Route path="notifications" element={<NotificationPage />} />
    <Route path="celebration-banners" element={<CelebrationBannerPage />} />
    <Route path="client-testimonials" element={<Outlet />}>
      <Route index element={<ClientTestimonialList />} />
      <Route path="new" element={<ClientTestimonialAdd />} />
      <Route path=":testimonialId/edit" element={<ClientTestimonialEdit />} />
      <Route path=":testimonialId" element={<ClientTestimonialView />} />
    </Route>
    <Route path="video-testimonials" element={<Outlet />}>
      <Route index element={<VideoTestimonialList />} />
      <Route path="new" element={<VideoTestimonialAdd />} />
      <Route path=":testimonialId/edit" element={<VideoTestimonialEdit />} />
      <Route path=":testimonialId" element={<VideoTestimonialView />} />
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
