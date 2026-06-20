import { Route, Navigate } from "react-router-dom";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { AssistantWellnessCoachLayout } from "../layout/AssistantWellnessCoachLayout.jsx";
import { AssistantDashboardPage } from "../pages/DashboardPage.jsx";
import { AssistantProfile } from "../pages/AssistantProfile.jsx";
import { AssistantMyHealUsersList } from "../pages/myHealUsers/AssistantMyHealUsersList.jsx";
import { AssistantUserWaterTrackingPage } from "../pages/myHealUsers/AssistantUserWaterTrackingPage.jsx";
import { AssistantConsultancyTransactionList } from "../pages/consultancy/AssistantConsultancyTransactionList.jsx";
import { AssistantConsultancyEnrolledUsersList } from "../pages/consultancy/AssistantConsultancyEnrolledUsersList.jsx";

export const assistantWellnessCoachRouteTree = (
  <Route path="/assistant" element={<AssistantWellnessCoachLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<AssistantDashboardPage />} />
    <Route path="profile" element={<AssistantProfile />} />
    <Route path="my-heal-users" element={<AssistantMyHealUsersList />} />
    <Route path="my-heal-users/:userId/water-tracking" element={<AssistantUserWaterTrackingPage />} />
    <Route path="consultancy/transactions" element={<AssistantConsultancyTransactionList />} />
    <Route path="consultancy/enrolled-users" element={<AssistantConsultancyEnrolledUsersList />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
