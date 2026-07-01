import { Route, Navigate } from "react-router-dom";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { AssistantWellnessCoachLayout } from "../layout/AssistantWellnessCoachLayout.jsx";
import { AssistantDashboardPage } from "../pages/DashboardPage.jsx";
import { AssistantProfile } from "../pages/AssistantProfile.jsx";
import { AssistantMyHealUsersList } from "../pages/myHealUsers/AssistantMyHealUsersList.jsx";
import { AssistantUserWaterTrackingPage } from "../pages/myHealUsers/AssistantUserWaterTrackingPage.jsx";
import { AssistantUserStepsTrackingPage } from "../pages/myHealUsers/AssistantUserStepsTrackingPage.jsx";
import { UserReminders } from "../pages/userReminders/UserReminders.jsx";
import { AssistantUserDietPlan } from "../pages/myHealUsers/AssistantUserDietPlan.jsx";
import { AssistantUserTestRecommendations } from "../pages/myHealUsers/AssistantUserTestRecommendations.jsx";
import { AssistantUserPhysicalExercises } from "../pages/myHealUsers/AssistantUserPhysicalExercises.jsx";
import { AssistantUserSupplementRecommendations } from "../pages/myHealUsers/AssistantUserSupplementRecommendations.jsx";
import { AssistantUserSupplementDosage } from "../pages/myHealUsers/AssistantUserSupplementDosage.jsx";
import { AssistantUserMealTrackingPage } from "../pages/myHealUsers/AssistantUserMealTrackingPage.jsx";
<<<<<<< HEAD
import { AssistantMealApprovalsPage } from "../pages/mealReview/AssistantMealApprovalsPage.jsx";
=======
import { AssistantUserLaunchAssessment } from "../pages/myHealUsers/AssistantUserLaunchAssessment.jsx";
>>>>>>> 5f74c8a2667b37ecb1d2a3db05a03805a932c2cc
import { AssistantConsultancyTransactionList } from "../pages/consultancy/AssistantConsultancyTransactionList.jsx";
import { AssistantConsultancyEnrolledUsersList } from "../pages/consultancy/AssistantConsultancyEnrolledUsersList.jsx";

export const assistantWellnessCoachRouteTree = (
  <Route path="/assistant" element={<AssistantWellnessCoachLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<AssistantDashboardPage />} />
    <Route path="profile" element={<AssistantProfile />} />
    <Route path="my-users" element={<AssistantMyHealUsersList />} />
    <Route path="my-users/:userId/water-tracking" element={<AssistantUserWaterTrackingPage />} />
    <Route path="my-users/:userId/steps-tracking" element={<AssistantUserStepsTrackingPage />} />
    <Route path="my-users/:userId/reminders" element={<UserReminders />} />
    <Route path="my-users/:userId/diet-plan" element={<AssistantUserDietPlan />} />
    <Route path="my-users/:userId/test-recommendations" element={<AssistantUserTestRecommendations />} />
    <Route path="my-users/:userId/physical-exercises" element={<AssistantUserPhysicalExercises />} />
    <Route path="my-users/:userId/supplement-recommendations" element={<AssistantUserSupplementRecommendations />} />
    <Route path="my-users/:userId/supplement-dosage" element={<AssistantUserSupplementDosage />} />
    <Route path="my-users/:userId/meal-tracking" element={<AssistantUserMealTrackingPage />} />
<<<<<<< HEAD
    <Route path="meal-approvals" element={<AssistantMealApprovalsPage />} />
=======
    <Route path="my-users/:userId/launch-assessment" element={<AssistantUserLaunchAssessment />} />
>>>>>>> 5f74c8a2667b37ecb1d2a3db05a03805a932c2cc
    <Route path="consultancy/transactions" element={<AssistantConsultancyTransactionList />} />
    <Route path="consultancy/enrolled-users" element={<AssistantConsultancyEnrolledUsersList />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
