import { Route, Navigate } from "react-router-dom";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { WellnessCoachLayout } from "../layout/WellnessCoachLayout.jsx";
import { CoachDashboardPage } from "../pages/DashboardPage.jsx";
import { CoachProfile } from "../pages/CoachProfile.jsx";
import { MyHealUsersList } from "../pages/myHealUsers/MyHealUsersList.jsx";
import { CoachUserWaterTrackingPage } from "../pages/myHealUsers/CoachUserWaterTrackingPage.jsx";
import { CoachUserStepsTrackingPage } from "../pages/myHealUsers/CoachUserStepsTrackingPage.jsx";
import { UserReminders } from "../pages/userReminders/UserReminders.jsx";
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
    <Route path="my-users/:userId/water-tracking" element={<CoachUserWaterTrackingPage />} />
    <Route path="my-users/:userId/steps-tracking" element={<CoachUserStepsTrackingPage />} />
    <Route path="my-users/:userId/reminders" element={<UserReminders />} />
    <Route path="consultancy/transactions" element={<CoachConsultancyTransactionList />} />
    <Route path="consultancy/enrolled-users" element={<CoachConsultancyEnrolledUsersList />} />
    <Route path="consultancy/clients/:userId" element={<CoachConsultancyClientPage />} />
    <Route path="my-assistants/new" element={<MyAssistantAdd />} />
    <Route path="my-assistants/:assistantId" element={<MyAssistantView />} />
    <Route path="my-assistants/:assistantId/edit" element={<MyAssistantEdit />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
