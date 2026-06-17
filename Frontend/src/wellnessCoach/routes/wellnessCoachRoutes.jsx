import { Route, Navigate } from "react-router-dom";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { WellnessCoachLayout } from "../layout/WellnessCoachLayout.jsx";
import { CoachDashboardPage } from "../pages/DashboardPage.jsx";
import { CoachProfile } from "../pages/CoachProfile.jsx";

export const wellnessCoachRouteTree = (
  <Route path="/coach" element={<WellnessCoachLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<CoachDashboardPage />} />
    <Route path="profile" element={<CoachProfile />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
