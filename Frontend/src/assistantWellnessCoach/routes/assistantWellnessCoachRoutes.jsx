import { Route, Navigate } from "react-router-dom";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { AssistantWellnessCoachLayout } from "../layout/AssistantWellnessCoachLayout.jsx";
import { AssistantDashboardPage } from "../pages/DashboardPage.jsx";
import { AssistantProfile } from "../pages/AssistantProfile.jsx";

export const assistantWellnessCoachRouteTree = (
  <Route path="/assistant" element={<AssistantWellnessCoachLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<AssistantDashboardPage />} />
    <Route path="profile" element={<AssistantProfile />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
