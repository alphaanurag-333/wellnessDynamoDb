import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ClientHubPage } from "../../../../components/ClientHubPage.jsx";
import { adminGetUser } from "../../../api/adminUsers.js";
import { logout } from "../../../../store/authSlice.js";
import { selectIsSuperAdmin, selectPermissions } from "../../../../store/authSelectors.js";
import {
  hasClientHubPermission,
  permissionKeyForClientHubTab,
} from "../../../data/adminClientHubPermissionKeys.js";
import { AdminUserWaterTrackingPage } from "../AdminUserWaterTrackingPage.jsx";
import { AdminUserStepsTrackingPage } from "../AdminUserStepsTrackingPage.jsx";
import { AdminUserReminders } from "./AdminUserReminders.jsx";
import { AdminUserDietPlan } from "./AdminUserDietPlan.jsx";
import { AdminUserWellnessPrescriptions } from "./AdminUserWellnessPrescriptions.jsx";
import { AdminUserTestRecommendations } from "./AdminUserTestRecommendations.jsx";
import { AdminUserPhysicalExercises } from "./AdminUserPhysicalExercises.jsx";
import { AdminUserMentalWellbeing } from "./AdminUserMentalWellbeing.jsx";
import { AdminUserMealTrackingPage } from "./AdminUserMealTrackingPage.jsx";
import { AdminUserSupplementRecommendations } from "./AdminUserSupplementRecommendations.jsx";
import { AdminUserSupplementDosage } from "./AdminUserSupplementDosage.jsx";
import { AdminUserLaunchAssessment } from "./AdminUserLaunchAssessment.jsx";
import { AdminUserPrakrutiAssessment } from "./AdminUserPrakrutiAssessment.jsx";
import { AdminUserHealthProgress } from "./AdminUserHealthProgress.jsx";
import { AdminUserMetabolicMetrics } from "./AdminUserMetabolicMetrics.jsx";
import { AdminUserHealConsultancyTracks } from "./AdminUserHealConsultancyTracks.jsx";
import { AdminUserDailyReflection } from "./AdminUserDailyReflection.jsx";
import { AdminUserCommitmentLetter } from "./AdminUserCommitmentLetter.jsx";
import { AdminUserCoachInsight } from "./AdminUserCoachInsight.jsx";

function renderAdminTab(tab, embedded) {
  switch (tab) {
    case "water":
      return <AdminUserWaterTrackingPage embedded={embedded} />;
    case "steps":
      return <AdminUserStepsTrackingPage embedded={embedded} />;
    case "reminders":
      return <AdminUserReminders embedded={embedded} />;
    case "diet-plan":
      return <AdminUserDietPlan embedded={embedded} />;
    case "wellness-prescriptions":
      return <AdminUserWellnessPrescriptions embedded={embedded} />;
    case "commitment-letter":
      return <AdminUserCommitmentLetter embedded={embedded} />;
    case "coach-message":
      return <AdminUserCoachInsight embedded={embedded} />;
    case "internal-parameters":
      return <AdminUserTestRecommendations embedded={embedded} />;
    case "physical-exercises":
      return <AdminUserPhysicalExercises embedded={embedded} />;
    case "mental-wellbeing":
      return <AdminUserMentalWellbeing embedded={embedded} />;
    case "supplement-recommendations":
      return <AdminUserSupplementRecommendations embedded={embedded} />;
    case "supplement-dosage":
      return <AdminUserSupplementDosage embedded={embedded} />;
    case "meal-tracking":
      return <AdminUserMealTrackingPage embedded={embedded} />;
    case "launch-assessment":
      return <AdminUserLaunchAssessment embedded={embedded} />;
    case "prakruti-assessment":
      return <AdminUserPrakrutiAssessment embedded={embedded} />;
    case "health-progress":
      return <AdminUserHealthProgress embedded={embedded} />;
    case "metabolic-metrics":
      return <AdminUserMetabolicMetrics embedded={embedded} />;
    case "consultancy":
      return <AdminUserHealConsultancyTracks embedded={embedded} />;
    case "daily-reflection":
      return <AdminUserDailyReflection embedded={embedded} />;
    default:
      return null;
  }
}

export function AdminUserClientHub() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const permissions = useSelector(selectPermissions);

  const canAccessTab = useCallback(
    (tabId) => {
      if (isSuperAdmin) return true;
      const key = permissionKeyForClientHubTab(tabId);
      if (!key) return true;
      return hasClientHubPermission(permissions, key);
    },
    [isSuperAdmin, permissions]
  );

  const fetchUser = useCallback(
    async (userId) => {
      if (!adminToken) return null;
      try {
        return await adminGetUser(adminToken, userId);
      } catch (e) {
        if (e?.status === 401) dispatch(logout());
        throw e;
      }
    },
    [adminToken, dispatch]
  );

  return (
    <ClientHubPage
      listPath="/admin/users"
      fetchUser={fetchUser}
      canAccessTab={canAccessTab}
      renderTab={(tab, { embedded }) => renderAdminTab(tab, embedded)}
    />
  );
}
