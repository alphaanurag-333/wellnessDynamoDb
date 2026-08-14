const express = require("express");
const adminAppConfigRoutes = require("./adminRoutes/adminAppConfigRoutes");
const adminFaqRoutes = require("./adminRoutes/adminFaqRoutes");
const adminConfigDropdownRoutes = require("./adminRoutes/adminConfigDropdownRoutes");
const adminSopRoutes = require("./adminRoutes/adminSopRoutes");
const adminCouponRoutes = require("./adminRoutes/adminCouponRoutes");
const adminNotificationRoutes = require("./adminRoutes/adminNotificationRoutes");
const adminInboxRoutes = require("./adminRoutes/adminInboxRoutes");
const adminStaticPageRoutes = require("./adminRoutes/adminStaticPageRoutes");
const adminTransformationRoutes = require("./adminRoutes/adminTransformationRoutes");
const adminBannerRoutes = require("./adminRoutes/adminBannerRoutes");
const adminHealthConcernRoutes = require("./adminRoutes/adminHealthConcernRoutes");
const adminHealthDisorderRoutes = require("./adminRoutes/adminHealthDisorderRoutes");
const adminHealthToolRoutes = require("./adminRoutes/adminHealthToolRoutes");
const adminHealthRecipeRoutes = require("./adminRoutes/adminHealthRecipeRoutes");
const adminYogaRoutes = require("./adminRoutes/adminYogaRoutes");
const adminPhysicalExerciseRoutes = require("./adminRoutes/adminPhysicalExerciseRoutes");
const adminSupplementRoutes = require("./adminRoutes/adminSupplementRoutes");
const adminMedicalConditionQuestionRoutes = require("./adminRoutes/adminMedicalConditionQuestionRoutes");
const adminLaunchQuestionRoutes = require("./adminRoutes/adminLaunchQuestionRoutes");
const adminLaunchFocusAreaRoutes = require("./adminRoutes/adminLaunchFocusAreaRoutes");
const adminPrakrutiQuestionRoutes = require("./adminRoutes/adminPrakrutiQuestionRoutes");
const adminPrakrutiThingToAvoidRoutes = require("./adminRoutes/adminPrakrutiThingToAvoidRoutes");
const adminPrakrutiRecommendationRoutes = require("./adminRoutes/adminPrakrutiRecommendationRoutes");
const adminTestCatalogRoutes = require("./adminRoutes/adminTestCatalogRoutes");
const adminDietPlanCatalogRoutes = require("./adminRoutes/adminDietPlanCatalogRoutes");
const adminWellnessPrescriptionCatalogRoutes = require("./adminRoutes/adminWellnessPrescriptionCatalogRoutes");
const adminMentalWellbeingRoutes = require("./adminRoutes/adminMentalWellbeingRoutes");
const adminUserRoutes = require("./adminRoutes/adminUserRoutes");
const adminWellnessCoachRoutes = require("./adminRoutes/adminWellnessCoachRoutes");
const adminSpecializationRoutes = require("./adminRoutes/adminSpecializationRoutes");
const adminBirthdayNotificationRoutes = require("./adminRoutes/adminBirthdayNotificationRoutes");
const adminBirthdayPostRoutes = require("./adminRoutes/adminBirthdayPostRoutes");
const adminClientTestimonialsRoutes = require("./adminRoutes/adminClientTestimonialsRoutes");
const adminLeadershipNoteRoutes = require("./adminRoutes/adminLeadershipNoteRoutes");
const adminProgramTestimonialRoutes = require("./adminRoutes/adminProgramTestimonialRoutes");
const adminVideoTestimonialsRoutes = require("./adminRoutes/adminVideoTestimonialsRoutes");
const adminRealPeopleTestimonialRoutes = require("./adminRoutes/adminRealPeopleTestimonialRoutes");
const adminCofounderMessageRoutes = require("./adminRoutes/adminCofounderMessageRoutes");
const adminContactInquiryRoutes = require("./adminRoutes/adminContactInquiryRoutes");
const adminEnergyExchangeRoutes = require("./adminRoutes/adminEnergyExchangeRoutes");
const adminProgramCatalogRoutes = require("./adminRoutes/adminProgramCatalogRoutes");
const publicAppConfigRoutes = require("./publicRoutes/publicAppConfigRoutes");
const miscRoutes = require("./userRoutes/miscRoutes");
const userAuthRoutes = require("./userRoutes/authRoutes");
const waterTrackingRoutes = require("./userRoutes/waterTrackingRoutes");
const stepsTrackingRoutes = require("./userRoutes/stepsTrackingRoutes");
const sleepTrackingRoutes = require("./userRoutes/sleepTrackingRoutes");
const heartRateTrackingRoutes = require("./userRoutes/heartRateTrackingRoutes");
const birthdayPostRoutes = require("./userRoutes/birthdayPostRoutes");
const userNotificationRoutes = require("./userRoutes/notificationRoutes");
const consultancyPaymentRoutes = require("./userRoutes/consultancyPaymentRoutes");
const subscriptionPaymentRoutes = require("./userRoutes/subscriptionPaymentRoutes");
const energyExchangeRoutes = require("./userRoutes/energyExchangeRoutes");
const programRoutes = require("./userRoutes/programRoutes");
const paidOnboardingRoutes = require("./userRoutes/paidOnboardingRoutes");
const userReminderRoutes = require("./userRoutes/reminderRoutes");
const userMealTrackingRoutes = require("./userRoutes/mealTrackingRoutes");
const userRealPeopleTestimonialRoutes = require("./userRoutes/realPeopleTestimonialRoutes");
const userClientTestimonialRoutes = require("./userRoutes/clientTestimonialRoutes");
const commitmentLetterRoutes = require("./userRoutes/commitmentLetterRoutes");
const monthlyChampionRoutes = require("./userRoutes/monthlyChampionRoutes");
const internalParameterRoutes = require("./userRoutes/internalParameterRoutes");
const dietPlanCatalogRoutes = require("./userRoutes/dietPlanCatalogRoutes");
const physicalExerciseRoutes = require("./userRoutes/physicalExerciseRoutes");
const mentalWellbeingRoutes = require("./userRoutes/mentalWellbeingRoutes");
const launchAssessmentRoutes = require("./userRoutes/launchAssessmentRoutes");
const prakrutiAssessmentRoutes = require("./userRoutes/prakrutiAssessmentRoutes");
const healthProgressRoutes = require("./userRoutes/healthProgressRoutes");
const metabolicMetricsRoutes = require("./userRoutes/metabolicMetricsRoutes");
const healConsultancyTrackRoutes = require("./userRoutes/healConsultancyTrackRoutes");
const dailyReflectionRoutes = require("./userRoutes/dailyReflectionRoutes");
const coachInsightRoutes = require("./userRoutes/coachInsightRoutes");
const supplementRecommendationRoutes = require("./userRoutes/supplementRecommendationRoutes");
const supplementDosageRoutes = require("./userRoutes/supplementDosageRoutes");
const wellnessPrescriptionRoutes = require("./userRoutes/wellnessPrescriptionRoutes");
const accountRoutes = require("./accountRoutes");
const {
  accountHealUserRoutes,
  accountDashboardRoutes,
  accountMealTrackingRoutes,
  accountConsultancyRoutes,
  accountCommitmentLetterRoutes,
  accountMonthlyChampionRoutes,
  accountAssistantRoutes,
  accountMeRoutes,
  accountEnergyExchangeRoutes,
  accountProgramRoutes,
  accountPortalClientTestimonialRoutes,
  accountActiveSpecializationRoutes,
} = accountRoutes;

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ ok: true });
});

/** Unified staff Account auth + APIs. Staff login lives only under /account/auth. */
router.use("/account", accountRoutes);

/** Compatibility aliases — same unified routers, old prefixes. */
router.use("/admin/heal-users", accountHealUserRoutes);
router.use("/coach/heal-users", accountHealUserRoutes);
router.use("/assistant/heal-users", accountHealUserRoutes);
router.use("/admin/dashboard", accountDashboardRoutes);
router.use("/coach/dashboard", accountDashboardRoutes);
router.use("/assistant/dashboard", accountDashboardRoutes);
router.use("/admin/meal-tracking", accountMealTrackingRoutes);
router.use("/coach/meal-tracking", accountMealTrackingRoutes);
router.use("/assistant/meal-tracking", accountMealTrackingRoutes);
router.use("/admin/consultancy", accountConsultancyRoutes);
router.use("/coach/consultancy", accountConsultancyRoutes);
router.use("/assistant/consultancy", accountConsultancyRoutes);
router.use("/admin/commitment-letters", accountCommitmentLetterRoutes);
router.use("/coach/commitment-letters", accountCommitmentLetterRoutes);
router.use("/assistant/commitment-letters", accountCommitmentLetterRoutes);
router.use("/admin/monthly-champions", accountMonthlyChampionRoutes);
router.use("/coach/monthly-champions", accountMonthlyChampionRoutes);
router.use("/assistant/monthly-champions", accountMonthlyChampionRoutes);
router.use("/coach/me", accountMeRoutes);
router.use("/coach/assistants", accountAssistantRoutes);
router.use("/coach/specializations", accountActiveSpecializationRoutes);
router.use("/coach/energy-exchange", accountEnergyExchangeRoutes);
router.use("/coach/programs", accountProgramRoutes);
router.use("/coach/client-testimonials", accountPortalClientTestimonialRoutes);
router.use("/assistant/client-testimonials", accountPortalClientTestimonialRoutes);
router.use("/admin/app-config", adminAppConfigRoutes);
router.use("/admin/faq", adminFaqRoutes);
router.use("/admin/config-dropdowns", adminConfigDropdownRoutes);
router.use("/admin/sops", adminSopRoutes);
router.use("/admin/coupons", adminCouponRoutes);
router.use("/admin/notifications", adminNotificationRoutes);
router.use("/admin/inbox", adminInboxRoutes);
router.use("/admin/transformations", adminTransformationRoutes);
router.use("/admin/banners", adminBannerRoutes);
router.use("/admin/birthday-notifications", adminBirthdayNotificationRoutes);
router.use("/admin/birthday-posts", adminBirthdayPostRoutes);
router.use("/admin/client-testimonials", adminClientTestimonialsRoutes);
router.use("/admin/leadership-notes", adminLeadershipNoteRoutes);
router.use("/admin/program-testimonials", adminProgramTestimonialRoutes);
router.use("/admin/video-testimonials", adminVideoTestimonialsRoutes);
router.use("/admin/real-people-testimonials", adminRealPeopleTestimonialRoutes);
router.use("/admin/cofounder-message", adminCofounderMessageRoutes);
router.use("/admin/contact-inquiries", adminContactInquiryRoutes);
router.use("/admin/energy-exchange", adminEnergyExchangeRoutes);
router.use("/admin/programs", adminProgramCatalogRoutes);
router.use("/admin/health-concerns", adminHealthConcernRoutes);
router.use("/admin/health-disorders", adminHealthDisorderRoutes);
router.use("/admin/health-tools", adminHealthToolRoutes);
router.use("/admin/health-recipes", adminHealthRecipeRoutes);
router.use("/admin/yoga", adminYogaRoutes);
router.use("/admin/physical-exercises", adminPhysicalExerciseRoutes);
router.use("/admin/supplements", adminSupplementRoutes);
router.use("/admin/medical-condition-questions", adminMedicalConditionQuestionRoutes);
router.use("/admin/launch-questions", adminLaunchQuestionRoutes);
router.use("/admin/launch-focus-areas", adminLaunchFocusAreaRoutes);
router.use("/admin/prakruti-questions", adminPrakrutiQuestionRoutes);
router.use("/admin/prakruti-things-to-avoid", adminPrakrutiThingToAvoidRoutes);
router.use("/admin/prakruti-recommendations", adminPrakrutiRecommendationRoutes);
router.use("/admin/test-catalog", adminTestCatalogRoutes);
router.use("/admin/diet-plan-catalog", adminDietPlanCatalogRoutes);
router.use("/admin/wellness-prescriptions", adminWellnessPrescriptionCatalogRoutes);
router.use("/admin/mental-wellbeing", adminMentalWellbeingRoutes);
router.use("/admin/users", adminUserRoutes);
router.use("/admin/wellness-coaches", adminWellnessCoachRoutes);
router.use("/admin/specializations", adminSpecializationRoutes);
router.use("/admin/misc/pages", adminStaticPageRoutes);
router.use("/user/auth", userAuthRoutes);
router.use("/user/water-tracking", waterTrackingRoutes);
router.use("/user/steps-tracking", stepsTrackingRoutes);
router.use("/user/sleep-tracking", sleepTrackingRoutes);
router.use("/user/heart-rate-tracking", heartRateTrackingRoutes);
router.use("/user/birthday-posts", birthdayPostRoutes);
router.use("/user/notifications", userNotificationRoutes);
router.use("/user/consultancy-payment", consultancyPaymentRoutes);
router.use("/user/subscription-payment", subscriptionPaymentRoutes);
router.use("/user/energy-exchange", energyExchangeRoutes);
router.use("/user/program", programRoutes);
router.use("/user/paid-onboarding", paidOnboardingRoutes);
router.use("/user/reminders", userReminderRoutes);
router.use("/user/real-people-testimonials", userRealPeopleTestimonialRoutes);
router.use("/user/client-testimonials", userClientTestimonialRoutes);
router.use("/user/commitment-letter", commitmentLetterRoutes);
router.use("/user/monthly-champions", monthlyChampionRoutes);
router.use("/user/meal-tracking", userMealTrackingRoutes);
router.use("/user/internal-parameters", internalParameterRoutes);
router.use("/user/diet-plans", dietPlanCatalogRoutes);
router.use("/user/physical-exercises", physicalExerciseRoutes);
router.use("/user/mental-wellbeing", mentalWellbeingRoutes);
router.use("/user/launch-assessment", launchAssessmentRoutes);
router.use("/user/prakruti-assessment", prakrutiAssessmentRoutes);
router.use("/user/health-progress", healthProgressRoutes);
router.use("/user/metabolic-metrics", metabolicMetricsRoutes);
router.use("/user/heal-consultancy-tracks", healConsultancyTrackRoutes);
router.use("/user/daily-reflection", dailyReflectionRoutes);
router.use("/user/coach-insight", coachInsightRoutes);
router.use("/user/supplements", supplementRecommendationRoutes);
router.use("/user/supplements", supplementDosageRoutes);
router.use("/user/wellness-prescriptions", wellnessPrescriptionRoutes);
router.use("/public", publicAppConfigRoutes);
router.use("/public/misc", miscRoutes);

module.exports = router;