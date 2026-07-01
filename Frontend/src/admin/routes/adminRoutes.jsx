import { Route, Navigate, Outlet } from "react-router-dom";
import { AdminLayout } from "../layout/AdminLayout.jsx";
import { AdminProfile } from "../pages/AdminProfile.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { NotFoundPage } from "../pages/NotFoundPage.jsx";
import { BusinessSetting } from "../pages/setting/BusinessSetting.jsx";
import { BannerList } from "../pages/banners/BannerList.jsx";
import { BannerAdd } from "../pages/banners/BannerAdd.jsx";
import { BannerEdit } from "../pages/banners/BannerEdit.jsx";
import { BannerView } from "../pages/banners/BannerView.jsx";
import { CouponList } from "../pages/coupon/CouponList.jsx";
import { CouponAdd } from "../pages/coupon/CouponAdd.jsx";
import { CouponEdit } from "../pages/coupon/CouponEdit.jsx";
import { CouponView } from "../pages/coupon/CouponView.jsx";
import { FaqList } from "../pages/faq/FaqList.jsx";
import { FaqAdd } from "../pages/faq/FaqAdd.jsx";
import { FaqEdit } from "../pages/faq/FaqEdit.jsx";
import { FaqView } from "../pages/faq/FaqView.jsx";
import { StaticPageList } from "../pages/static-pages/StaticPageList.jsx";
import { StaticPageUpdate } from "../pages/static-pages/StaticPageUpdate.jsx";
import { NotificationList } from "../pages/notification/NotificationList.jsx";
import { NotificationAdd } from "../pages/notification/NotificationAdd.jsx";
import { NotificationEdit } from "../pages/notification/NotificationEdit.jsx";
import { NotificationView } from "../pages/notification/NotificationView.jsx";
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
import { PhysicalExerciseList } from "../pages/physicalExercise/PhysicalExerciseList.jsx";
import { PhysicalExerciseAdd } from "../pages/physicalExercise/PhysicalExerciseAdd.jsx";
import { PhysicalExerciseEdit } from "../pages/physicalExercise/PhysicalExerciseEdit.jsx";
import { PhysicalExerciseView } from "../pages/physicalExercise/PhysicalExerciseView.jsx";
import { SupplementList } from "../pages/supplement/SupplementList.jsx";
import { SupplementAdd } from "../pages/supplement/SupplementAdd.jsx";
import { SupplementEdit } from "../pages/supplement/SupplementEdit.jsx";
import { SupplementView } from "../pages/supplement/SupplementView.jsx";
import { MedicalConditionQuestionList } from "../pages/medicalConditionQuestion/MedicalConditionQuestionList.jsx";
import { MedicalConditionQuestionAdd } from "../pages/medicalConditionQuestion/MedicalConditionQuestionAdd.jsx";
import { MedicalConditionQuestionEdit } from "../pages/medicalConditionQuestion/MedicalConditionQuestionEdit.jsx";
import { MedicalConditionQuestionView } from "../pages/medicalConditionQuestion/MedicalConditionQuestionView.jsx";
import { TestCatalogList } from "../pages/testCatalog/TestCatalogList.jsx";
import { TestCatalogAdd } from "../pages/testCatalog/TestCatalogAdd.jsx";
import { TestCatalogEdit } from "../pages/testCatalog/TestCatalogEdit.jsx";
import { TestCatalogView } from "../pages/testCatalog/TestCatalogView.jsx";
import { MentalWellbeingList } from "../pages/mentalWellbeing/MentalWellbeingList.jsx";
import { MentalWellbeingAdd } from "../pages/mentalWellbeing/MentalWellbeingAdd.jsx";
import { MentalWellbeingEdit } from "../pages/mentalWellbeing/MentalWellbeingEdit.jsx";
import { MentalWellbeingView } from "../pages/mentalWellbeing/MentalWellbeingView.jsx";
import { TransformationList } from "../pages/transformation/TransformationList.jsx";
import { TransformationAdd } from "../pages/transformation/TransformationAdd.jsx";
import { TransformationEdit } from "../pages/transformation/TransformationEdit.jsx";
import { TransformationView } from "../pages/transformation/TransformationView.jsx";
import { BirthdayNotificationList } from "../pages/birthdayNotification/BirthdayNotificationList.jsx";
import { BirthdayNotificationView } from "../pages/birthdayNotification/BirthdayNotificationView.jsx";
import { BirthdayPostList } from "../pages/birthdayPost/BirthdayPostList.jsx";
import { BirthdayPostView } from "../pages/birthdayPost/BirthdayPostView.jsx";
import { BirthdayPostEdit } from "../pages/birthdayPost/BirthdayPostEdit.jsx";
import { ClientTestimonialList } from "../pages/clientTestimonial/ClientTestimonialList.jsx";
import { ClientTestimonialAdd } from "../pages/clientTestimonial/ClientTestimonialAdd.jsx";
import { ClientTestimonialEdit } from "../pages/clientTestimonial/ClientTestimonialEdit.jsx";
import { ClientTestimonialView } from "../pages/clientTestimonial/ClientTestimonialView.jsx";
import { VideoTestimonialList } from "../pages/videoTestimonial/VideoTestimonialList.jsx";
import { VideoTestimonialAdd } from "../pages/videoTestimonial/VideoTestimonialAdd.jsx";
import { VideoTestimonialEdit } from "../pages/videoTestimonial/VideoTestimonialEdit.jsx";
import { VideoTestimonialView } from "../pages/videoTestimonial/VideoTestimonialView.jsx";
import { CofounderMessagePage } from "../pages/cofounderMessage/CofounderMessagePage.jsx";
import {SectionPage} from "../pages/SectionPage.jsx";
import { UserAdd } from "../pages/user/UserAdd.jsx";
import { UserEdit } from "../pages/user/UserEdit.jsx";
import { UserList } from "../pages/user/UserList.jsx";
import { ConsultancyTransactionList } from "../pages/consultancy/ConsultancyTransactionList.jsx";
import { ConsultancyEnrolledUsersList } from "../pages/consultancy/ConsultancyEnrolledUsersList.jsx";
import { UserView } from "../pages/user/UserView.jsx";
import { PendingAssignmentList } from "../pages/user/PendingAssignmentList.jsx";
import { AdminUserWaterTrackingPage } from "../pages/user/AdminUserWaterTrackingPage.jsx";
import { AdminUserStepsTrackingPage } from "../pages/user/AdminUserStepsTrackingPage.jsx";
import { AdminUserDietPlanPage } from "../pages/user/AdminUserDietPlanPage.jsx";
import { AdminUserMealTrackingPage } from "../pages/user/AdminUserMealTrackingPage.jsx";
import { WellnessCoachList } from "../pages/wellnessCoach/WellnessCoachList.jsx";
import { WellnessCoachAdd } from "../pages/wellnessCoach/WellnessCoachAdd.jsx";
import { WellnessCoachEdit } from "../pages/wellnessCoach/WellnessCoachEdit.jsx";
import { WellnessCoachView } from "../pages/wellnessCoach/WellnessCoachView.jsx";
import { AssistantList } from "../pages/assistantWellnessCoach/AssistantList.jsx";
import { AssistantAdd } from "../pages/assistantWellnessCoach/AssistantAdd.jsx";
import { AssistantEdit } from "../pages/assistantWellnessCoach/AssistantEdit.jsx";
import { AssistantView } from "../pages/assistantWellnessCoach/AssistantView.jsx";
import { SpecializationList } from "../pages/specialization/SpecializationList.jsx";
import { SpecializationAdd } from "../pages/specialization/SpecializationAdd.jsx";
import { SpecializationEdit } from "../pages/specialization/SpecializationEdit.jsx";
import { SpecializationView } from "../pages/specialization/SpecializationView.jsx";

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

    <Route path="consultancy/transactions" element={<ConsultancyTransactionList />} />
    <Route path="consultancy/enrolled-users" element={<ConsultancyEnrolledUsersList />} />
    <Route path="consultancy/pending-assignment" element={<PendingAssignmentList />} />

    <Route path="users" element={<Outlet />}>
      <Route index element={<UserList />} />
      <Route path="pending-assignment" element={<Navigate to="/admin/consultancy/pending-assignment" replace />} />
      <Route path="new" element={<UserAdd />} />
      <Route path=":userId/water-tracking" element={<AdminUserWaterTrackingPage />} />
      <Route path=":userId/steps-tracking" element={<AdminUserStepsTrackingPage />} />
      <Route path=":userId/diet-plan" element={<AdminUserDietPlanPage />} />
      <Route path=":userId/meal-tracking" element={<AdminUserMealTrackingPage />} />
      <Route path=":userId/edit" element={<UserEdit />} />
      <Route path=":userId" element={<UserView />} />
    </Route>
    <Route path="programs" element={<SectionPage title="Programs" />} />
    <Route path="coaches" element={<Outlet />}>
      <Route index element={<WellnessCoachList />} />
      <Route path="new" element={<WellnessCoachAdd />} />
      <Route path=":coachId/edit" element={<WellnessCoachEdit />} />
      <Route path=":coachId/assistants/new" element={<AssistantAdd />} />
      <Route path=":coachId/assistants/:assistantId/edit" element={<AssistantEdit />} />
      <Route path=":coachId/assistants/:assistantId" element={<AssistantView />} />
      <Route path=":coachId" element={<WellnessCoachView />} />
    </Route>
    <Route path="awcs" element={<AssistantList />} />
    <Route path="specializations" element={<Outlet />}>
      <Route index element={<SpecializationList />} />
      <Route path="new" element={<SpecializationAdd />} />
      <Route path=":specializationId/edit" element={<SpecializationEdit />} />
      <Route path=":specializationId" element={<SpecializationView />} />
    </Route>
    <Route path="nutrition-plans" element={<SectionPage title="Nutrition Plans" />} />
    <Route path="support-tickets" element={<SectionPage title="Support Tickets" />} />
    <Route path="camp-events" element={<SectionPage title="Camp Events" />} />
    <Route path="program-completions" element={<SectionPage title="Program Completions" />} />

    <Route path="banners" element={<Outlet />}>
      <Route index element={<BannerList />} />
      <Route path="new" element={<BannerAdd />} />
      <Route path=":bannerId/edit" element={<BannerEdit />} />
      <Route path=":bannerId" element={<BannerView />} />
    </Route>
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
    <Route path="physical-exercises" element={<Outlet />}>
      <Route index element={<PhysicalExerciseList />} />
      <Route path="new" element={<PhysicalExerciseAdd />} />
      <Route path=":exerciseId/edit" element={<PhysicalExerciseEdit />} />
      <Route path=":exerciseId" element={<PhysicalExerciseView />} />
    </Route>
    <Route path="supplements" element={<Outlet />}>
      <Route index element={<SupplementList />} />
      <Route path="new" element={<SupplementAdd />} />
      <Route path=":supplementId/edit" element={<SupplementEdit />} />
      <Route path=":supplementId" element={<SupplementView />} />
    </Route>
    <Route path="medical-condition-questions" element={<Outlet />}>
      <Route index element={<MedicalConditionQuestionList />} />
      <Route path="new" element={<MedicalConditionQuestionAdd />} />
      <Route path=":questionId/edit" element={<MedicalConditionQuestionEdit />} />
      <Route path=":questionId" element={<MedicalConditionQuestionView />} />
    </Route>
    <Route path="test-catalog" element={<Outlet />}>
      <Route index element={<TestCatalogList />} />
      <Route path="new" element={<TestCatalogAdd />} />
      <Route path=":testId/edit" element={<TestCatalogEdit />} />
      <Route path=":testId" element={<TestCatalogView />} />
    </Route>
    <Route path="mental-wellbeing" element={<Outlet />}>
      <Route index element={<MentalWellbeingList />} />
      <Route path="new" element={<MentalWellbeingAdd />} />
      <Route path=":itemId/edit" element={<MentalWellbeingEdit />} />
      <Route path=":itemId" element={<MentalWellbeingView />} />
    </Route>
    <Route path="transformations" element={<Outlet />}>
      <Route index element={<TransformationList />} />
      <Route path="new" element={<TransformationAdd />} />
      <Route path=":transformationId/edit" element={<TransformationEdit />} />
      <Route path=":transformationId" element={<TransformationView />} />
    </Route>
    <Route path="coupons" element={<Outlet />}>
      <Route index element={<CouponList />} />
      <Route path="new" element={<CouponAdd />} />
      <Route path=":couponId/edit" element={<CouponEdit />} />
      <Route path=":couponId" element={<CouponView />} />
    </Route>
    <Route path="faq" element={<Outlet />}>
      <Route index element={<FaqList />} />
      <Route path="new" element={<FaqAdd />} />
      <Route path=":faqId/edit" element={<FaqEdit />} />
      <Route path=":faqId" element={<FaqView />} />
    </Route>
    <Route path="notifications" element={<Outlet />}>
      <Route index element={<NotificationList />} />
      <Route path="new" element={<NotificationAdd />} />
      <Route path=":notificationId/edit" element={<NotificationEdit />} />
      <Route path=":notificationId" element={<NotificationView />} />
    </Route>
    <Route path="birthday-notifications" element={<Outlet />}>
      <Route index element={<BirthdayNotificationList />} />
      <Route path=":notificationId" element={<BirthdayNotificationView />} />
    </Route>
    <Route path="birthday-posts" element={<Outlet />}>
      <Route index element={<BirthdayPostList />} />
      <Route path=":postId/edit" element={<BirthdayPostEdit />} />
      <Route path=":postId" element={<BirthdayPostView />} />
    </Route>
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

    <Route path="cofounder-message" element={<CofounderMessagePage />} />

    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
