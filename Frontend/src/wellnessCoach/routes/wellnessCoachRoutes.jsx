import { Route, Navigate } from "react-router-dom";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { WellnessCoachLayout } from "../layout/WellnessCoachLayout.jsx";
import { CoachDashboardPage } from "../pages/DashboardPage.jsx";
import { CoachProfile } from "../pages/CoachProfile.jsx";
import { MyHealUsersList } from "../pages/myHealUsers/MyHealUsersList.jsx";
import { UserClientHub } from "../pages/myHealUsers/UserClientHub.jsx";
import { ClientHubLegacyRedirect } from "../../components/ClientHubLegacyRedirect.jsx";
import { CoachMealApprovalsPage } from "../pages/mealReview/CoachMealApprovalsPage.jsx";
import { MyAssistantList } from "../pages/myAssistants/MyAssistantList.jsx";
import { MyAssistantAdd } from "../pages/myAssistants/MyAssistantAdd.jsx";
import { MyAssistantEdit } from "../pages/myAssistants/MyAssistantEdit.jsx";
import { MyAssistantView } from "../pages/myAssistants/MyAssistantView.jsx";
import { CoachConsultancyTransactionList } from "../pages/consultancy/CoachConsultancyTransactionList.jsx";
import { CoachConsultancyEnrolledUsersList } from "../pages/consultancy/CoachConsultancyEnrolledUsersList.jsx";
import { CoachConsultancyClientPage } from "../pages/consultancy/CoachConsultancyClientPage.jsx";

export const wellnessCoachRouteTree = (
  <Route path="/coach" element={<WellnessCoachLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<CoachDashboardPage />} />
    <Route path="profile" element={<CoachProfile />} />
    <Route path="my-assistants" element={<MyAssistantList />} />
    <Route path="my-users" element={<MyHealUsersList />} />
    <Route path="my-users/:userId" element={<UserClientHub />} />
    <Route path="my-users/:userId/water-tracking" element={<ClientHubLegacyRedirect segment="water-tracking" basePath="/coach" />} />
    <Route path="my-users/:userId/steps-tracking" element={<ClientHubLegacyRedirect segment="steps-tracking" basePath="/coach" />} />
    <Route path="my-users/:userId/reminders" element={<ClientHubLegacyRedirect segment="reminders" basePath="/coach" />} />
    <Route path="my-users/:userId/diet-plan" element={<ClientHubLegacyRedirect segment="diet-plan" basePath="/coach" />} />
    <Route path="my-users/:userId/wellness-prescriptions" element={<ClientHubLegacyRedirect segment="wellness-prescriptions" basePath="/coach" />} />
    <Route path="my-users/:userId/test-recommendations" element={<ClientHubLegacyRedirect segment="test-recommendations" basePath="/coach" />} />
    <Route path="my-users/:userId/physical-exercises" element={<ClientHubLegacyRedirect segment="physical-exercises" basePath="/coach" />} />
    <Route path="my-users/:userId/mental-wellbeing" element={<ClientHubLegacyRedirect segment="mental-wellbeing" basePath="/coach" />} />
    <Route path="my-users/:userId/daily-reflection" element={<ClientHubLegacyRedirect segment="daily-reflection" basePath="/coach" />} />
    <Route path="my-users/:userId/supplement-recommendations" element={<ClientHubLegacyRedirect segment="supplement-recommendations" basePath="/coach" />} />
    <Route path="my-users/:userId/supplement-dosage" element={<ClientHubLegacyRedirect segment="supplement-dosage" basePath="/coach" />} />
    <Route path="my-users/:userId/meal-tracking" element={<ClientHubLegacyRedirect segment="meal-tracking" basePath="/coach" />} />
    <Route path="my-users/:userId/launch-assessment" element={<ClientHubLegacyRedirect segment="launch-assessment" basePath="/coach" />} />
    <Route path="my-users/:userId/prakruti-assessment" element={<ClientHubLegacyRedirect segment="prakruti-assessment" basePath="/coach" />} />
    <Route path="meal-approvals" element={<CoachMealApprovalsPage />} />
    <Route path="consultancy/transactions" element={<CoachConsultancyTransactionList />} />
    <Route path="consultancy/enrolled-users" element={<CoachConsultancyEnrolledUsersList />} />
    <Route path="consultancy/clients/:userId" element={<CoachConsultancyClientPage />} />
    <Route path="my-assistants/new" element={<MyAssistantAdd />} />
    <Route path="my-assistants/:assistantId" element={<MyAssistantView />} />
    <Route path="my-assistants/:assistantId/edit" element={<MyAssistantEdit />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
