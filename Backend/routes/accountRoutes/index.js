const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const accountAuthRoutes = require("./accountAuthRoutes");
const accountHealUserRoutes = require("./accountHealUserRoutes");
const accountAccessRoutes = require("./accountAccessRoutes");
const accountDashboardRoutes = require("./accountDashboardRoutes");
const accountMealTrackingRoutes = require("./accountMealTrackingRoutes");
const accountConsultancyRoutes = require("./accountConsultancyRoutes");
const accountCommitmentLetterRoutes = require("./accountCommitmentLetterRoutes");
const accountMonthlyChampionRoutes = require("./accountMonthlyChampionRoutes");
const accountAssistantRoutes = require("./accountAssistantRoutes");
const accountMeRoutes = require("./accountMeRoutes");
const accountEnergyExchangeRoutes = require("./accountEnergyExchangeRoutes");
const accountProgramRoutes = require("./accountProgramRoutes");
const accountCoachCheckoutRoutes = require("./accountCoachCheckoutRoutes");
const {
  listStaffCalendarOnboardingMeetingsController,
} = require("../../controllers/adminController/onboardingMeetingController");
const accountPortalClientTestimonialRoutes = require("./accountPortalClientTestimonialRoutes");
const accountActiveSpecializationRoutes = require("./accountActiveSpecializationRoutes");
const {
  listAccountsHandler,
  getAccountHandler,
  createAccountHandler,
  updateAccountHandler,
  deleteAccountHandler,
  grantMembershipHandler,
  revokeMembershipHandler,
  patchCoachContentHandler,
  patchAccountTotpHandler,
  regenerateAccountTotpHandler,
} = require("../../controllers/accountController/accountAdminController");
const { optionalCoachContentFiles, optionalUserFile } = require("../../middleware/authMultipart");

const adminSopRoutes = require("../adminRoutes/adminSopRoutes");
const adminAppConfigRoutes = require("../adminRoutes/adminAppConfigRoutes");
const adminUserRoutes = require("../adminRoutes/adminUserRoutes");
const adminWellnessCoachRoutes = require("../adminRoutes/adminWellnessCoachRoutes");
const adminBannerRoutes = require("../adminRoutes/adminBannerRoutes");
const adminFaqRoutes = require("../adminRoutes/adminFaqRoutes");
const adminConfigDropdownRoutes = require("../adminRoutes/adminConfigDropdownRoutes");
const adminCouponRoutes = require("../adminRoutes/adminCouponRoutes");
const adminNotificationRoutes = require("../adminRoutes/adminNotificationRoutes");
const adminInboxRoutes = require("../adminRoutes/adminInboxRoutes");
const adminStaticPageRoutes = require("../adminRoutes/adminStaticPageRoutes");
const adminTransformationRoutes = require("../adminRoutes/adminTransformationRoutes");
const adminHealthConcernRoutes = require("../adminRoutes/adminHealthConcernRoutes");
const adminHealthDisorderRoutes = require("../adminRoutes/adminHealthDisorderRoutes");
const adminHealthToolRoutes = require("../adminRoutes/adminHealthToolRoutes");
const adminHealthRecipeRoutes = require("../adminRoutes/adminHealthRecipeRoutes");
const adminYogaRoutes = require("../adminRoutes/adminYogaRoutes");
const adminPhysicalExerciseRoutes = require("../adminRoutes/adminPhysicalExerciseRoutes");
const adminSupplementRoutes = require("../adminRoutes/adminSupplementRoutes");
const adminMedicalConditionQuestionRoutes = require("../adminRoutes/adminMedicalConditionQuestionRoutes");
const adminLaunchQuestionRoutes = require("../adminRoutes/adminLaunchQuestionRoutes");
const adminLaunchFocusAreaRoutes = require("../adminRoutes/adminLaunchFocusAreaRoutes");
const adminLaunchConfigRoutes = require("../adminRoutes/adminLaunchConfigRoutes");
const adminDrfConfigRoutes = require("../adminRoutes/adminDrfConfigRoutes");
const adminPrakrutiQuestionRoutes = require("../adminRoutes/adminPrakrutiQuestionRoutes");
const adminPrakrutiThingToAvoidRoutes = require("../adminRoutes/adminPrakrutiThingToAvoidRoutes");
const adminPrakrutiRecommendationRoutes = require("../adminRoutes/adminPrakrutiRecommendationRoutes");
const adminTestCatalogRoutes = require("../adminRoutes/adminTestCatalogRoutes");
const adminDietPlanCatalogRoutes = require("../adminRoutes/adminDietPlanCatalogRoutes");
const adminDietPlanBookRoutes = require("../adminRoutes/adminDietPlanBookRoutes");
const adminWellnessPrescriptionCatalogRoutes = require("../adminRoutes/adminWellnessPrescriptionCatalogRoutes");
const adminAiEnableRoutes = require("../adminRoutes/adminAiEnableRoutes");
const adminMentalWellbeingRoutes = require("../adminRoutes/adminMentalWellbeingRoutes");
const adminWellnessYogaRoutes = require("../adminRoutes/adminWellnessYogaRoutes");
const adminSpecializationRoutes = require("../adminRoutes/adminSpecializationRoutes");
const adminBirthdayNotificationRoutes = require("../adminRoutes/adminBirthdayNotificationRoutes");
const adminBirthdayPostRoutes = require("../adminRoutes/adminBirthdayPostRoutes");
const adminClientTestimonialsRoutes = require("../adminRoutes/adminClientTestimonialsRoutes");
const adminLeadershipNoteRoutes = require("../adminRoutes/adminLeadershipNoteRoutes");
const adminWellnessTeamNoteRoutes = require("../adminRoutes/adminWellnessTeamNoteRoutes");
const adminProgramTestimonialRoutes = require("../adminRoutes/adminProgramTestimonialRoutes");
const adminVideoTestimonialsRoutes = require("../adminRoutes/adminVideoTestimonialsRoutes");
const adminRealPeopleTestimonialRoutes = require("../adminRoutes/adminRealPeopleTestimonialRoutes");
const adminCofounderMessageRoutes = require("../adminRoutes/adminCofounderMessageRoutes");
const adminContactInquiryRoutes = require("../adminRoutes/adminContactInquiryRoutes");
const adminReferralTreeRoutes = require("../adminRoutes/adminReferralTreeRoutes");
const adminEnergyExchangeRoutes = require("../adminRoutes/adminEnergyExchangeRoutes");
const adminProgramCatalogRoutes = require("../adminRoutes/adminProgramCatalogRoutes");
const adminBlogConfigRoutes = require("../adminRoutes/adminBlogConfigRoutes");
const adminBlogPostRoutes = require("../adminRoutes/adminBlogPostRoutes");
const adminBlogMediaRoutes = require("../adminRoutes/adminBlogMediaRoutes");  
const router = express.Router();

router.use("/auth", accountAuthRoutes);
router.use("/heal-users", accountHealUserRoutes);
router.get(
  "/onboarding-meetings",
  protectAccount,
  requireActiveRole("admin", "wellness_coach", "assistant_wellness_coach", "trainee"),
  listStaffCalendarOnboardingMeetingsController
);
router.use("/access", accountAccessRoutes);
router.use("/dashboard", accountDashboardRoutes);
router.use("/meal-tracking", accountMealTrackingRoutes);
router.use("/consultancy", accountConsultancyRoutes);
router.use("/commitment-letters", accountCommitmentLetterRoutes);
router.use("/monthly-champions", accountMonthlyChampionRoutes);
router.use("/assistants", accountAssistantRoutes);
router.use("/me", accountMeRoutes);
router.use("/energy-exchange", accountEnergyExchangeRoutes);
router.use("/programs", accountProgramRoutes);
router.use("/specialization-options", accountActiveSpecializationRoutes);
router.use("/specializations", adminSpecializationRoutes);
router.use("/client-testimonials", adminClientTestimonialsRoutes);
router.use("/portal-client-testimonials", accountPortalClientTestimonialRoutes);

router.get("/accounts", protectAccount, requireActiveRole("admin"), listAccountsHandler);
router.post("/accounts", protectAccount, requireActiveRole("admin"), createAccountHandler);
router.patch(
  "/accounts/:id/totp",
  protectAccount,
  requireActiveRole("admin"),
  patchAccountTotpHandler
);
router.post(
  "/accounts/:id/totp/regenerate",
  protectAccount,
  requireActiveRole("admin"),
  regenerateAccountTotpHandler
);
router.route("/accounts/:id")
  .get(protectAccount, requireActiveRole("admin"), getAccountHandler)
  .patch(protectAccount, requireActiveRole("admin"), optionalUserFile, updateAccountHandler)
  .put(protectAccount, requireActiveRole("admin"), optionalUserFile, updateAccountHandler)
  .delete(protectAccount, requireActiveRole("admin"), deleteAccountHandler);
router.post(
  "/accounts/:id/delete",
  protectAccount,
  requireActiveRole("admin"),
  deleteAccountHandler
);
router.patch(
  "/accounts/:id/coach-content",
  protectAccount,
  requireActiveRole("admin"),
  optionalCoachContentFiles,
  patchCoachContentHandler
);
router.post(
  "/accounts/:id/memberships",
  protectAccount,
  requireActiveRole("admin"),
  grantMembershipHandler
);
router.delete(
  "/accounts/:id/memberships/:roleKey",
  protectAccount,
  requireActiveRole("admin"),
  revokeMembershipHandler
);

router.use("/sops", adminSopRoutes);
router.use("/app-config", adminAppConfigRoutes);
router.use("/coach-checkout", accountCoachCheckoutRoutes);
router.use("/users", adminUserRoutes);
router.use("/wellness-coaches", adminWellnessCoachRoutes);
router.use("/banners", adminBannerRoutes);
router.use("/faq", adminFaqRoutes);
router.use("/config-dropdowns", adminConfigDropdownRoutes);
router.use("/coupons", adminCouponRoutes);
router.use("/notifications", adminNotificationRoutes);
router.use("/inbox", adminInboxRoutes);
router.use("/misc/pages", adminStaticPageRoutes);
router.use("/transformations", adminTransformationRoutes);
router.use("/health-concerns", adminHealthConcernRoutes);
router.use("/health-disorders", adminHealthDisorderRoutes);
router.use("/health-tools", adminHealthToolRoutes);
router.use("/health-recipes", adminHealthRecipeRoutes);
router.use("/yoga", adminYogaRoutes);
router.use("/blog-config", adminBlogConfigRoutes);
router.use("/blog-posts", adminBlogPostRoutes);
router.use("/blog-media", adminBlogMediaRoutes);
router.use("/physical-exercises", adminPhysicalExerciseRoutes);
router.use("/supplements", adminSupplementRoutes);
router.use("/medical-condition-questions", adminMedicalConditionQuestionRoutes);
router.use("/launch-questions", adminLaunchQuestionRoutes);
router.use("/launch-focus-areas", adminLaunchFocusAreaRoutes);
router.use("/launch-config", adminLaunchConfigRoutes);
router.use("/drf-config", adminDrfConfigRoutes);
router.use("/prakruti-questions", adminPrakrutiQuestionRoutes);
router.use("/prakruti-things-to-avoid", adminPrakrutiThingToAvoidRoutes);
router.use("/prakruti-recommendations", adminPrakrutiRecommendationRoutes);
router.use("/test-catalog", adminTestCatalogRoutes);
router.use("/diet-plan-catalog", adminDietPlanCatalogRoutes);
router.use("/diet-plan-book", adminDietPlanBookRoutes);
router.use("/wellness-prescriptions", adminWellnessPrescriptionCatalogRoutes);
router.use("/ai-enable", adminAiEnableRoutes);
router.use("/mental-wellbeing", adminMentalWellbeingRoutes);
router.use("/wellness-yoga", adminWellnessYogaRoutes);
router.use("/birthday-notifications", adminBirthdayNotificationRoutes);
router.use("/birthday-posts", adminBirthdayPostRoutes);
router.use("/leadership-notes", adminLeadershipNoteRoutes);
router.use("/wellness-team-notes", adminWellnessTeamNoteRoutes);
router.use("/program-testimonials", adminProgramTestimonialRoutes);
router.use("/video-testimonials", adminVideoTestimonialsRoutes);
router.use("/real-people-testimonials", adminRealPeopleTestimonialRoutes);
router.use("/cofounder-message", adminCofounderMessageRoutes);
router.use("/contact-inquiries", adminContactInquiryRoutes);
router.use("/referral-tree", adminReferralTreeRoutes);
router.use("/energy-exchange-catalog", adminEnergyExchangeRoutes);
router.use("/program-catalog", adminProgramCatalogRoutes);

module.exports = router;
module.exports.accountHealUserRoutes = accountHealUserRoutes;
module.exports.accountDashboardRoutes = accountDashboardRoutes;
module.exports.accountMealTrackingRoutes = accountMealTrackingRoutes;
module.exports.accountConsultancyRoutes = accountConsultancyRoutes;
module.exports.accountCommitmentLetterRoutes = accountCommitmentLetterRoutes;
module.exports.accountMonthlyChampionRoutes = accountMonthlyChampionRoutes;
module.exports.accountAssistantRoutes = accountAssistantRoutes;
module.exports.accountMeRoutes = accountMeRoutes;
module.exports.accountEnergyExchangeRoutes = accountEnergyExchangeRoutes;
module.exports.accountProgramRoutes = accountProgramRoutes;
module.exports.accountPortalClientTestimonialRoutes = accountPortalClientTestimonialRoutes;
module.exports.accountActiveSpecializationRoutes = accountActiveSpecializationRoutes;
