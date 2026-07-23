import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ClientHubPage } from "../../../components/ClientHubPage.jsx";
import { coachGetUserWaterTracking } from "../../api/coachWaterTracking.js";
import { logoutCoach } from "../../../store/authSlice.js";
import { useCoachPermissions } from "../../hooks/useHasPermission.jsx";
import { permissionKeyForClientTab } from "../../data/coachPermissionKeys.js";
import { CoachUserWaterTrackingPage } from "./CoachUserWaterTrackingPage.jsx";
import { CoachUserStepsTrackingPage } from "./CoachUserStepsTrackingPage.jsx";
import { UserReminders } from "../userReminders/UserReminders.jsx";
import { UserDietPlan } from "./UserDietPlan.jsx";
import { UserWellnessPrescriptions } from "./UserWellnessPrescriptions.jsx";
import { UserTestRecommendations } from "./UserTestRecommendations.jsx";
import { UserPhysicalExercises } from "./UserPhysicalExercises.jsx";
import { UserMentalWellbeing } from "./UserMentalWellbeing.jsx";
import { CoachUserMealTrackingPage } from "./CoachUserMealTrackingPage.jsx";
import { UserSupplementRecommendations } from "./UserSupplementRecommendations.jsx";
import { UserSupplementDosage } from "./UserSupplementDosage.jsx";
import { UserLaunchAssessment } from "./UserLaunchAssessment.jsx";
import { UserPrakrutiAssessment } from "./UserPrakrutiAssessment.jsx";
import { UserHealthProgress } from "./UserHealthProgress.jsx";
import { UserMetabolicMetrics } from "./UserMetabolicMetrics.jsx";
import { UserHealConsultancyTracks } from "./UserHealConsultancyTracks.jsx";
import { UserDailyReflection } from "./UserDailyReflection.jsx";
import { UserCommitmentLetter } from "./UserCommitmentLetter.jsx";
import { UserCoachInsight } from "./UserCoachInsight.jsx";

function renderCoachTab(tab, embedded) {
  switch (tab) {
    case "water":
      return <CoachUserWaterTrackingPage embedded={embedded} />;
    case "steps":
      return <CoachUserStepsTrackingPage embedded={embedded} />;
    case "reminders":
      return <UserReminders embedded={embedded} />;
    case "diet-plan":
      return <UserDietPlan embedded={embedded} />;
    case "wellness-prescriptions":
      return <UserWellnessPrescriptions embedded={embedded} />;
    case "commitment-letter":
      return <UserCommitmentLetter embedded={embedded} />;
    case "coach-message":
      return <UserCoachInsight embedded={embedded} />;
    case "internal-parameters":
      return <UserTestRecommendations embedded={embedded} />;
    case "physical-exercises":
      return <UserPhysicalExercises embedded={embedded} />;
    case "mental-wellbeing":
      return <UserMentalWellbeing embedded={embedded} />;
    case "supplement-recommendations":
      return <UserSupplementRecommendations embedded={embedded} />;
    case "supplement-dosage":
      return <UserSupplementDosage embedded={embedded} />;
    case "meal-tracking":
      return <CoachUserMealTrackingPage embedded={embedded} />;
    case "launch-assessment":
      return <UserLaunchAssessment embedded={embedded} />;
    case "prakruti-assessment":
      return <UserPrakrutiAssessment embedded={embedded} />;
    case "health-progress":
      return <UserHealthProgress embedded={embedded} />;
    case "metabolic-metrics":
      return <UserMetabolicMetrics embedded={embedded} />;
    case "consultancy":
      return <UserHealConsultancyTracks embedded={embedded} />;
    case "daily-reflection":
      return <UserDailyReflection embedded={embedded} />;
    default:
      return null;
  }
}

export function UserClientHub() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const { hasPermission } = useCoachPermissions();
  const canAccessClientTab = useCallback(
    (tabId) => {
      const key = permissionKeyForClientTab(tabId);
      if (!key) return true;
      return hasPermission(key);
    },
    [hasPermission]
  );

  const fetchUser = useCallback(
    async (userId) => {
      if (!coachToken) return null;
      try {
        const result = await coachGetUserWaterTracking(coachToken, userId, { days: 7 });
        return result.user;
      } catch (e) {
        if (e?.status === 401) dispatch(logoutCoach());
        throw e;
      }
    },
    [coachToken, dispatch]
  );

  return (
    <ClientHubPage
      listPath="/coach/my-users"
      fetchUser={fetchUser}
      canAccessTab={canAccessClientTab}
      renderTab={(tab, { embedded }) => renderCoachTab(tab, embedded)}
    />
  );
}
