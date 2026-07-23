import { Route, Navigate } from "react-router-dom";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { WellnessCoachLayout } from "../layout/WellnessCoachLayout.jsx";
import { CoachDashboardPage } from "../pages/DashboardPage.jsx";
import { CoachProfile } from "../pages/CoachProfile.jsx";
import { MyHealUsersList } from "../pages/myHealUsers/MyHealUsersList.jsx";
import { UserClientHub } from "../pages/myHealUsers/UserClientHub.jsx";
import { ClientHubLegacyRedirect } from "../../components/ClientHubLegacyRedirect.jsx";
import { CoachRealPeopleTestimonialsPage } from "../pages/realPeopleTestimonial/CoachRealPeopleTestimonialsPage.jsx";
import { CoachCommitmentLettersPage } from "../pages/commitmentLetter/CoachCommitmentLettersPage.jsx";
import { CoachClientTestimonialsLayout, CoachClientTestimonialList, CoachClientTestimonialView, CoachClientTestimonialEdit } from "../pages/clientTestimonial/CoachClientTestimonialsPage.jsx";
import { CoachMonthlyChampionsLayout, CoachMonthlyChampionList, CoachMonthlyChampionView } from "../pages/monthlyChampion/CoachMonthlyChampionsPage.jsx";
import { CoachMealApprovalsPage } from "../pages/mealReview/CoachMealApprovalsPage.jsx";
import { CoachConsultancyTransactionList } from "../pages/consultancy/CoachConsultancyTransactionList.jsx";
import { CoachConsultancyEnrolledUsersList } from "../pages/consultancy/CoachConsultancyEnrolledUsersList.jsx";
import { CoachConsultancyClientPage } from "../pages/consultancy/CoachConsultancyClientPage.jsx";
import { RequireCoachPermission } from "../components/RequireCoachPermission.jsx";

function guarded(permission, element) {
  return <RequireCoachPermission permission={permission}>{element}</RequireCoachPermission>;
}

export const wellnessCoachRouteTree = (
  <Route path="/coach" element={<WellnessCoachLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={guarded("nav.dashboard", <CoachDashboardPage />)} />
    <Route path="profile" element={guarded("nav.profile", <CoachProfile />)} />
    <Route path="my-users" element={guarded("nav.my-users", <MyHealUsersList />)} />
    <Route path="my-users/:userId" element={guarded("nav.my-users", <UserClientHub />)} />
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
    <Route path="meal-approvals" element={guarded("nav.meal-approvals", <CoachMealApprovalsPage />)} />
    <Route path="client-testimonials" element={guarded("nav.client-testimonials", <CoachClientTestimonialsLayout />)}>
      <Route index element={<CoachClientTestimonialList />} />
      <Route path=":testimonialId/edit" element={<CoachClientTestimonialEdit />} />
      <Route path=":testimonialId" element={<CoachClientTestimonialView />} />
    </Route>
    <Route path="real-people-testimonials" element={<CoachRealPeopleTestimonialsPage />} />
    <Route path="commitment-letters" element={guarded("nav.commitment-letters", <CoachCommitmentLettersPage />)} />
    <Route path="monthly-champions" element={guarded("nav.monthly-champions", <CoachMonthlyChampionsLayout />)}>
      <Route index element={<CoachMonthlyChampionList />} />
      <Route path=":postId" element={<CoachMonthlyChampionView />} />
    </Route>
    <Route
      path="consultancy/transactions"
      element={guarded("nav.consultancy/transactions", <CoachConsultancyTransactionList />)}
    />
    <Route
      path="consultancy/enrolled-users"
      element={guarded("nav.consultancy/enrolled-users", <CoachConsultancyEnrolledUsersList />)}
    />
    <Route
      path="consultancy/clients/:userId"
      element={guarded("nav.consultancy/enrolled-users", <CoachConsultancyClientPage />)}
    />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
