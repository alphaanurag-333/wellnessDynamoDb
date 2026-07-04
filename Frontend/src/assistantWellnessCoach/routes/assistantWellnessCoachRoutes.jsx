import { Route, Navigate } from "react-router-dom";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { AssistantWellnessCoachLayout } from "../layout/AssistantWellnessCoachLayout.jsx";
import { AssistantDashboardPage } from "../pages/DashboardPage.jsx";
import { AssistantProfile } from "../pages/AssistantProfile.jsx";
import { AssistantMyHealUsersList } from "../pages/myHealUsers/AssistantMyHealUsersList.jsx";
import { AssistantUserClientHub } from "../pages/myHealUsers/AssistantUserClientHub.jsx";
import { ClientHubLegacyRedirect } from "../../components/ClientHubLegacyRedirect.jsx";
import { AssistantRealPeopleTestimonialsPage } from "../pages/realPeopleTestimonial/AssistantRealPeopleTestimonialsPage.jsx";
import { AssistantCommitmentLettersPage } from "../pages/commitmentLetter/AssistantCommitmentLettersPage.jsx";
import { AssistantMealApprovalsPage } from "../pages/mealReview/AssistantMealApprovalsPage.jsx";
import { AssistantConsultancyTransactionList } from "../pages/consultancy/AssistantConsultancyTransactionList.jsx";
import { AssistantConsultancyEnrolledUsersList } from "../pages/consultancy/AssistantConsultancyEnrolledUsersList.jsx";

export const assistantWellnessCoachRouteTree = (
  <Route path="/assistant" element={<AssistantWellnessCoachLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<AssistantDashboardPage />} />
    <Route path="profile" element={<AssistantProfile />} />
    <Route path="my-users" element={<AssistantMyHealUsersList />} />
    <Route path="my-users/:userId" element={<AssistantUserClientHub />} />
    <Route path="my-users/:userId/water-tracking" element={<ClientHubLegacyRedirect segment="water-tracking" basePath="/assistant" />} />
    <Route path="my-users/:userId/steps-tracking" element={<ClientHubLegacyRedirect segment="steps-tracking" basePath="/assistant" />} />
    <Route path="my-users/:userId/reminders" element={<ClientHubLegacyRedirect segment="reminders" basePath="/assistant" />} />
    <Route path="my-users/:userId/diet-plan" element={<ClientHubLegacyRedirect segment="diet-plan" basePath="/assistant" />} />
    <Route path="my-users/:userId/wellness-prescriptions" element={<ClientHubLegacyRedirect segment="wellness-prescriptions" basePath="/assistant" />} />
    <Route path="my-users/:userId/test-recommendations" element={<ClientHubLegacyRedirect segment="test-recommendations" basePath="/assistant" />} />
    <Route path="my-users/:userId/physical-exercises" element={<ClientHubLegacyRedirect segment="physical-exercises" basePath="/assistant" />} />
    <Route path="my-users/:userId/mental-wellbeing" element={<ClientHubLegacyRedirect segment="mental-wellbeing" basePath="/assistant" />} />
    <Route path="my-users/:userId/daily-reflection" element={<ClientHubLegacyRedirect segment="daily-reflection" basePath="/assistant" />} />
    <Route path="my-users/:userId/supplement-recommendations" element={<ClientHubLegacyRedirect segment="supplement-recommendations" basePath="/assistant" />} />
    <Route path="my-users/:userId/supplement-dosage" element={<ClientHubLegacyRedirect segment="supplement-dosage" basePath="/assistant" />} />
    <Route path="my-users/:userId/meal-tracking" element={<ClientHubLegacyRedirect segment="meal-tracking" basePath="/assistant" />} />
    <Route path="my-users/:userId/launch-assessment" element={<ClientHubLegacyRedirect segment="launch-assessment" basePath="/assistant" />} />
    <Route path="my-users/:userId/prakruti-assessment" element={<ClientHubLegacyRedirect segment="prakruti-assessment" basePath="/assistant" />} />
    <Route path="meal-approvals" element={<AssistantMealApprovalsPage />} />
    <Route path="real-people-testimonials" element={<AssistantRealPeopleTestimonialsPage />} />
    <Route path="commitment-letters" element={<AssistantCommitmentLettersPage />} />
    <Route path="consultancy/transactions" element={<AssistantConsultancyTransactionList />} />
    <Route path="consultancy/enrolled-users" element={<AssistantConsultancyEnrolledUsersList />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
