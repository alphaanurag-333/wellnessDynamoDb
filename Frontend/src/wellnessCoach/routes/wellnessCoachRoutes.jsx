import { Route, Navigate } from "react-router-dom";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { WellnessCoachLayout } from "../layout/WellnessCoachLayout.jsx";
import { CoachDashboardPage } from "../pages/DashboardPage.jsx";
import { CoachProfile } from "../pages/CoachProfile.jsx";
import { MyHealUsersList } from "../pages/myHealUsers/MyHealUsersList.jsx";
import { CoachUserWaterTrackingPage } from "../pages/myHealUsers/CoachUserWaterTrackingPage.jsx";
import { MyAssistantList } from "../pages/myAssistants/MyAssistantList.jsx";
import { MyAssistantAdd } from "../pages/myAssistants/MyAssistantAdd.jsx";
import { MyAssistantEdit } from "../pages/myAssistants/MyAssistantEdit.jsx";
import { MyAssistantView } from "../pages/myAssistants/MyAssistantView.jsx";

export const wellnessCoachRouteTree = (
  <Route path="/coach" element={<WellnessCoachLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<CoachDashboardPage />} />
    <Route path="profile" element={<CoachProfile />} />
    <Route path="my-assistants" element={<MyAssistantList />} />
    <Route path="my-heal-users" element={<MyHealUsersList />} />
    <Route path="my-heal-users/:userId/water-tracking" element={<CoachUserWaterTrackingPage />} />
    <Route path="my-assistants/new" element={<MyAssistantAdd />} />
    <Route path="my-assistants/:assistantId" element={<MyAssistantView />} />
    <Route path="my-assistants/:assistantId/edit" element={<MyAssistantEdit />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
