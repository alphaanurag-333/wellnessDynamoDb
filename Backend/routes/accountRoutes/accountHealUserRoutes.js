/**
 * Unified staff clinical routes under /api/account/heal-users.
 * protectAccount + role gate + authorizeStaff (console slug + legacy fallback).
 */
const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalMealPhotoFile, optionalUserFile, optionalSupplementBillFile, optionalHealthProgressWeightPicFile } = require("../../middleware/authMultipart");
const { CLINICAL_ROLES } = require("../../controllers/staffAccess");
const {
  listHealUsersForStaffController,
  getHealUserForStaffController,
  reassignHealUserForStaffController,
} = require("../../controllers/adminController/userAssignmentController");
const {
  listCoachUserRemindersController,
  createCoachUserReminderController,
  updateCoachUserReminderController,
  toggleCoachUserReminderController,
  deleteCoachUserReminderController,
} = require("../../controllers/adminController/reminderController");
const {
  listCoachUserTestRecommendationsController,
  createCoachUserTestRecommendationController,
  downloadCoachUserTestRecommendationPdfController,
  deleteCoachUserTestRecommendationController,
  listCoachUserLabReportsController,
  reviewCoachUserLabReportController,
  analyzeCoachUserLabReportController,
  updateCoachUserLabReportAiController,
  listCoachUserActiveTestCatalogController,
} = require("../../controllers/adminController/testRecommendationController");
const {
  listCoachUserWellnessPrescriptionsController,
  createCoachUserWellnessPrescriptionController,
  updateCoachUserWellnessPrescriptionController,
  deleteCoachUserWellnessPrescriptionController,
} = require("../../controllers/adminController/wellnessPrescriptionController");
const {
  listCoachUserDietPlanAssignmentsController,
  createCoachUserDietPlanAssignmentController,
  deleteCoachUserDietPlanAssignmentController,
  updateCoachUserDietPlanEnabledController,
} = require("../../controllers/adminController/dietPlanCatalogAssignmentController");
const {
  listCoachUserPhysicalExercisesController,
  createCoachUserPhysicalExercisesController,
  deleteCoachUserPhysicalExerciseController,
} = require("../../controllers/adminController/physicalExerciseAssignmentController");
const {
  listCoachUserMentalWellbeingController,
  createCoachUserMentalWellbeingController,
  deleteCoachUserMentalWellbeingController,
} = require("../../controllers/adminController/mentalWellbeingAssignmentController");
const {
  listCoachUserWellnessYogaController,
  createCoachUserWellnessYogaController,
  deleteCoachUserWellnessYogaController,
} = require("../../controllers/adminController/wellnessYogaAssignmentController");
const {
  listCoachUserSupplementRecommendationsController,
  createCoachUserSupplementRecommendationController,
  deleteCoachUserSupplementRecommendationController,
  upsertCoachUserSupplementFulfilmentOrderController,
  uploadCoachUserSupplementFulfilmentOrderBillController,
  deleteCoachUserSupplementFulfilmentOrderController,
} = require("../../controllers/adminController/supplementRecommendationController");
const {
  listCoachUserSupplementDosagesController,
  createCoachUserSupplementDosageController,
  deleteCoachUserSupplementDosageController,
} = require("../../controllers/adminController/supplementDosageController");
const {
  listCoachUserMealTrackingController,
  createCoachUserMealLogController,
  updateCoachUserMealLogController,
  deleteCoachUserMealLogController,
  updateCoachUserMealTrackingModeController,
  analyzeCoachUserMealLogController,
} = require("../../controllers/adminController/mealTrackingController");
const {
  listCoachUserLaunchFocusAreasController,
  getCoachUserLaunchConfigController,
  listCoachUserLaunchQuestionsController,
  listCoachUserLaunchAssessmentsController,
  getCoachUserLaunchAssessmentByDateController,
  createCoachUserLaunchAssessmentController,
  updateCoachUserLaunchAssessmentController,
  deleteCoachUserLaunchAssessmentController,
  exportCoachUserLaunchQuestionsController,
} = require("../../controllers/adminController/launchAssessmentController");
const {
  listCoachUserPrakrutiThingsToAvoidController,
  listCoachUserPrakrutiQuestionsController,
  listCoachUserPrakrutiRecommendationsController,
  getCoachUserPrakrutiAssessmentController,
  saveCoachUserPrakrutiAssessmentController,
  exportCoachUserPrakrutiQuestionsController,
} = require("../../controllers/adminController/prakrutiAssessmentController");
const {
  getCoachHealthProgressSettingsController,
  updateCoachHealthProgressSettingsController,
  listCoachWeightLogsController,
  createCoachWeightLogController,
  listCoachGlucoseLogsController,
  listCoachBloodPressureLogsController,
  listCoachMenstrualCycleLogsController,
  listCoachConditionLogsController,
} = require("../../controllers/adminController/healthProgressController");
const {
  getCoachMetabolicMetricsDashboardController,
  listCoachMetabolicMetricHistoryController,
  createCoachFattyLiverMetricController,
} = require("../../controllers/adminController/metabolicMetricsController");
const {
  getCoachUserDailyReflectionSettingsController,
  updateCoachUserDailyReflectionSettingsController,
  getCoachUserDailyReflectionHistoryController,
  submitCoachUserDailyReflectionController,
  pushCoachUserDailyReflectionBedtimeController,
} = require("../../controllers/adminController/dailyReflectionController");
const {
  getCoachUserCommitmentLetterController,
  reviewCoachCommitmentLetterController,
} = require("../../controllers/adminController/commitmentLetterController");
const {
  reviewPresentablePicController,
  requestPresentablePicController,
  patchPresentablePicsSettingsController,
  downloadPresentablePicController,
  deletePresentablePicController,
} = require("../../controllers/adminController/userController");
const {
  getCoachUserCoachInsightController,
  upsertCoachUserCoachInsightController,
} = require("../../controllers/adminController/coachInsightController");
const {
  listCoachHealConsultancyTracksController,
  createCoachHealConsultancyTrackController,
  updateCoachHealConsultancyTrackController,
  deleteCoachHealConsultancyTrackController,
  offerCoachHealConsultancyPeriodsController,
  confirmCoachHealConsultancyTimeController,
} = require("../../controllers/adminController/healConsultancyTrackController");
const {
  getStaffUserProtocolSettingsController,
  saveStaffUserProtocolSettingsController,
} = require("../../controllers/adminController/protocolSettingsController");
const {
  getStaffUserGutResetsController,
  saveStaffUserGutResetController,
} = require("../../controllers/adminController/gutResetController");
const {
  getStaffHealUserWaterTrackingController,
  updateStaffHealUserWaterGoalController,
} = require("../../controllers/waterTrackingHistoryController");
const { getStaffHealUserStepsTrackingController } = require("../../controllers/stepsTrackingHistoryController");
const { getStaffHealUserSleepTrackingController } = require("../../controllers/sleepTrackingHistoryController");
const { getStaffHealUserHeartRateTrackingController } = require("../../controllers/heartRateTrackingHistoryController");
const {
  updateCoachUserBmsTrackingController,
} = require("../../controllers/adminController/bmsTrackingController");
const {
  patchUserOnboardingStepController,
  pushUserOnboardingReminderController,
} = require("../../controllers/adminController/onboardingStepController");
const {
  listStaffUserRcaController,
  submitStaffUserRcaController,
  listStaffUserProtocolController,
  saveStaffUserProtocolController,
} = require("../../controllers/adminController/onboardingCoachStepsController");
const {
  listStaffOnboardingMeetingsController,
  createStaffOnboardingMeetingController,
  acceptOnboardingMeetingRequestController,
  rejectOnboardingMeetingRequestController,
  cancelStaffOnboardingMeetingController,
} = require("../../controllers/adminController/onboardingMeetingController");

function staff(consoleSlug, { admin, coach } = {}) {
  return authorizeStaff(consoleSlug, {
    admin,
    wellness_coach: coach,
    assistant_wellness_coach: coach,
    trainee: coach,
  });
}

const router = express.Router({ mergeParams: true });
router.use(protectAccount, requireActiveRole(...CLINICAL_ROLES));

router.get("/", staff("console.cl.view", { admin: "users.view", coach: "nav.my-users" }), listHealUsersForStaffController);
router.post(
  "/:id/reassign",
  requireActiveRole("admin", "wellness_coach"),
  staff("console.ra.edit", { admin: "users.edit", coach: "nav.my-users" }),
  reassignHealUserForStaffController
);

router.get("/:id/water-tracking", staff("console.body.view", { admin: "users.view", coach: "clientTab.tracking.water" }), getStaffHealUserWaterTrackingController);
router.patch(
  "/:id/water-tracking/goal",
  staff("console.diet.edit", { admin: "users.edit", coach: "clientTab.tracking.water" }),
  updateStaffHealUserWaterGoalController
);
router.get("/:id/steps-tracking", staff("console.body.view", { admin: "users.view", coach: "clientTab.tracking.steps" }), getStaffHealUserStepsTrackingController);
router.get("/:id/sleep-tracking", staff("console.body.view", { admin: "users.view", coach: "clientTab.tracking" }), getStaffHealUserSleepTrackingController);
router.get("/:id/heart-rate-tracking", staff("console.body.view", { admin: "users.view", coach: "clientTab.tracking" }), getStaffHealUserHeartRateTrackingController);
router.patch(
  "/:userId/bms-tracking",
  staff("console.body.edit", { admin: "users.edit", coach: "clientTab.tracking" }),
  updateCoachUserBmsTrackingController
);

const careReminders = staff("console.diet.view", { admin: "users.clientHub.care.reminders", coach: "clientTab.care.reminders" });
const careRemindersWrite = staff("console.diet.edit", { admin: "users.clientHub.care.reminders", coach: "clientTab.care.reminders" });
router.get("/:userId/reminders", careReminders, listCoachUserRemindersController);
router.post("/:userId/reminders", careRemindersWrite, createCoachUserReminderController);
router.put("/:userId/reminders/:reminderId", careRemindersWrite, updateCoachUserReminderController);
router.patch("/:userId/reminders/:reminderId/toggle", careRemindersWrite, toggleCoachUserReminderController);
router.delete("/:userId/reminders/:reminderId", staff("console.diet.delete", { admin: "users.clientHub.care.reminders", coach: "clientTab.care.reminders" }), deleteCoachUserReminderController);

const tests = staff("console.rep.view", { admin: "users.clientHub.care.internal-parameters", coach: "clientTab.care.internal-parameters" });
const testsWrite = staff("console.rep.edit", { admin: "users.clientHub.care.internal-parameters", coach: "clientTab.care.internal-parameters" });
router.get("/:userId/test-recommendations", tests, listCoachUserTestRecommendationsController);
router.post("/:userId/test-recommendations", testsWrite, createCoachUserTestRecommendationController);
router.get("/:userId/test-recommendations/:recommendationId/pdf", tests, downloadCoachUserTestRecommendationPdfController);
router.get("/:userId/test-catalog", tests, listCoachUserActiveTestCatalogController);
router.get("/:userId/lab-reports", tests, listCoachUserLabReportsController);
router.patch("/:userId/lab-reports/:reportId/review", testsWrite, reviewCoachUserLabReportController);
router.post("/:userId/lab-reports/:reportId/analyze", testsWrite, analyzeCoachUserLabReportController);
router.patch("/:userId/lab-reports/:reportId/ai-analysis", testsWrite, updateCoachUserLabReportAiController);
router.delete("/:userId/test-recommendations/:recommendationId", staff("console.rep.delete", { admin: "users.clientHub.care.internal-parameters", coach: "clientTab.care.internal-parameters" }), deleteCoachUserTestRecommendationController);

const rx = staff("console.diet.view", { admin: "users.clientHub.care.wellness-prescriptions", coach: "clientTab.care.wellness-prescriptions" });
const rxWrite = staff("console.diet.create", { admin: "users.clientHub.care.wellness-prescriptions", coach: "clientTab.care.wellness-prescriptions" });
const rxEdit = staff(["console.diet.edit", "console.diet.create"], { admin: "users.clientHub.care.wellness-prescriptions", coach: "clientTab.care.wellness-prescriptions" });
router.get("/:userId/wellness-prescriptions", rx, listCoachUserWellnessPrescriptionsController);
router.post("/:userId/wellness-prescriptions", rxWrite, createCoachUserWellnessPrescriptionController);
router.put("/:userId/wellness-prescriptions/:assignmentId", rxEdit, updateCoachUserWellnessPrescriptionController);
router.delete("/:userId/wellness-prescriptions/:assignmentId", staff("console.diet.delete", { admin: "users.clientHub.care.wellness-prescriptions", coach: "clientTab.care.wellness-prescriptions" }), deleteCoachUserWellnessPrescriptionController);

const diet = staff("console.diet.view", { admin: "users.clientHub.care.diet-plan", coach: "clientTab.care.diet-plan" });
const dietWrite = staff("console.diet.create", { admin: "users.clientHub.care.diet-plan", coach: "clientTab.care.diet-plan" });
router.get("/:userId/diet-plan-assignments", diet, listCoachUserDietPlanAssignmentsController);
router.post("/:userId/diet-plan-assignments", dietWrite, createCoachUserDietPlanAssignmentController);
router.patch("/:userId/diet-plan-enabled", dietWrite, updateCoachUserDietPlanEnabledController);
router.delete("/:userId/diet-plan-assignments/:assignmentId", staff("console.diet.delete", { admin: "users.clientHub.care.diet-plan", coach: "clientTab.care.diet-plan" }), deleteCoachUserDietPlanAssignmentController);

const pe = staff("console.diet.view", { admin: "users.clientHub.wellness.physical-exercises", coach: "clientTab.wellness.physical-exercises" });
const peWrite = staff("console.diet.create", { admin: "users.clientHub.wellness.physical-exercises", coach: "clientTab.wellness.physical-exercises" });
router.get("/:userId/physical-exercises", pe, listCoachUserPhysicalExercisesController);
router.post("/:userId/physical-exercises", peWrite, createCoachUserPhysicalExercisesController);
router.delete("/:userId/physical-exercises/:assignmentId", staff("console.diet.delete", { admin: "users.clientHub.wellness.physical-exercises", coach: "clientTab.wellness.physical-exercises" }), deleteCoachUserPhysicalExerciseController);

const mw = staff("console.diet.view", { admin: "users.clientHub.wellness.mental-wellbeing", coach: "clientTab.wellness.mental-wellbeing" });
const mwWrite = staff("console.diet.create", { admin: "users.clientHub.wellness.mental-wellbeing", coach: "clientTab.wellness.mental-wellbeing" });
router.get("/:userId/mental-wellbeing", mw, listCoachUserMentalWellbeingController);
router.post("/:userId/mental-wellbeing", mwWrite, createCoachUserMentalWellbeingController);
router.delete("/:userId/mental-wellbeing/:assignmentId", staff("console.diet.delete", { admin: "users.clientHub.wellness.mental-wellbeing", coach: "clientTab.wellness.mental-wellbeing" }), deleteCoachUserMentalWellbeingController);

const yoga = staff("console.diet.view", { admin: "users.clientHub.wellness.yoga", coach: "clientTab.wellness.yoga" });
const yogaWrite = staff("console.diet.create", { admin: "users.clientHub.wellness.yoga", coach: "clientTab.wellness.yoga" });
router.get("/:userId/wellness-yoga", yoga, listCoachUserWellnessYogaController);
router.post("/:userId/wellness-yoga", yogaWrite, createCoachUserWellnessYogaController);
router.delete("/:userId/wellness-yoga/:assignmentId", staff("console.diet.delete", { admin: "users.clientHub.wellness.yoga", coach: "clientTab.wellness.yoga" }), deleteCoachUserWellnessYogaController);

const supp = staff("console.diet.view", { admin: "users.clientHub.wellness.supplement-recommendations", coach: "clientTab.wellness.supplement-recommendations" });
const suppWrite = staff("console.diet.create", { admin: "users.clientHub.wellness.supplement-recommendations", coach: "clientTab.wellness.supplement-recommendations" });
router.get("/:userId/supplement-recommendations", supp, listCoachUserSupplementRecommendationsController);
router.post("/:userId/supplement-recommendations", suppWrite, createCoachUserSupplementRecommendationController);
router.delete("/:userId/supplement-recommendations/:recommendationId", staff("console.diet.delete", { admin: "users.clientHub.wellness.supplement-recommendations", coach: "clientTab.wellness.supplement-recommendations" }), deleteCoachUserSupplementRecommendationController);
router.post(
  "/:userId/supplement-recommendations/:recommendationId/fulfilment-orders",
  suppWrite,
  upsertCoachUserSupplementFulfilmentOrderController
);
router.put(
  "/:userId/supplement-recommendations/:recommendationId/fulfilment-orders/:orderId",
  suppWrite,
  upsertCoachUserSupplementFulfilmentOrderController
);
router.post(
  "/:userId/supplement-recommendations/:recommendationId/fulfilment-orders/:orderId/bill",
  suppWrite,
  optionalSupplementBillFile,
  uploadCoachUserSupplementFulfilmentOrderBillController
);
router.delete(
  "/:userId/supplement-recommendations/:recommendationId/fulfilment-orders/:orderId",
  staff("console.diet.delete", { admin: "users.clientHub.wellness.supplement-recommendations", coach: "clientTab.wellness.supplement-recommendations" }),
  deleteCoachUserSupplementFulfilmentOrderController
);

const dosage = staff("console.diet.view", { admin: "users.clientHub.wellness.supplement-dosage", coach: "clientTab.wellness.supplement-dosage" });
const dosageWrite = staff("console.diet.create", { admin: "users.clientHub.wellness.supplement-dosage", coach: "clientTab.wellness.supplement-dosage" });
router.get("/:userId/supplement-dosages", dosage, listCoachUserSupplementDosagesController);
router.post("/:userId/supplement-dosages", dosageWrite, createCoachUserSupplementDosageController);
router.delete("/:userId/supplement-dosages/:dosageId", staff("console.diet.delete", { admin: "users.clientHub.wellness.supplement-dosage", coach: "clientTab.wellness.supplement-dosage" }), deleteCoachUserSupplementDosageController);

const meal = staff("console.diet.view", { admin: "users.clientHub.tracking.meal-tracking", coach: "clientTab.tracking.meal-tracking" });
const mealWrite = staff("console.diet.edit", { admin: "users.clientHub.tracking.meal-tracking", coach: "clientTab.tracking.meal-tracking" });
router.get("/:userId/meal-tracking", meal, listCoachUserMealTrackingController);
router.post("/:userId/meal-tracking", mealWrite, optionalMealPhotoFile, createCoachUserMealLogController);
router.put("/:userId/meal-tracking/:logId", mealWrite, optionalMealPhotoFile, updateCoachUserMealLogController);
router.post("/:userId/meal-tracking/:logId/analyze", mealWrite, analyzeCoachUserMealLogController);
router.delete("/:userId/meal-tracking/:logId", staff("console.diet.delete", { admin: "users.clientHub.tracking.meal-tracking", coach: "clientTab.tracking.meal-tracking" }), deleteCoachUserMealLogController);
router.patch("/:userId/meal-tracking-mode", mealWrite, updateCoachUserMealTrackingModeController);

const launch = staff("console.body.view", { admin: "users.clientHub.assessments.launch-assessment", coach: "clientTab.assessments.launch-assessment" });
const launchWrite = staff("console.body.edit", { admin: "users.clientHub.assessments.launch-assessment", coach: "clientTab.assessments.launch-assessment" });
router.get("/:userId/launch-assessment/focus-areas", launch, listCoachUserLaunchFocusAreasController);
router.get("/:userId/launch-assessment/config", launch, getCoachUserLaunchConfigController);
router.get("/:userId/launch-assessment/questions", launch, listCoachUserLaunchQuestionsController);
router.get("/:userId/launch-assessment/export", staff("console.body.export", { admin: "users.clientHub.assessments.launch-assessment", coach: "clientTab.assessments.launch-assessment" }), exportCoachUserLaunchQuestionsController);
router.get("/:userId/launch-assessment", launch, listCoachUserLaunchAssessmentsController);
router.get("/:userId/launch-assessment/by-date", launch, getCoachUserLaunchAssessmentByDateController);
router.post("/:userId/launch-assessment", launchWrite, createCoachUserLaunchAssessmentController);
router.patch("/:userId/launch-assessment/:assessmentId", launchWrite, updateCoachUserLaunchAssessmentController);
router.delete("/:userId/launch-assessment/:assessmentId", staff("console.body.edit", { admin: "users.clientHub.assessments.launch-assessment", coach: "clientTab.assessments.launch-assessment" }), deleteCoachUserLaunchAssessmentController);

const prakruti = staff("console.body.view", { admin: "users.clientHub.assessments.prakruti-assessment", coach: "clientTab.assessments.prakruti-assessment" });
const prakrutiWrite = staff("console.body.edit", { admin: "users.clientHub.assessments.prakruti-assessment", coach: "clientTab.assessments.prakruti-assessment" });
router.get("/:userId/prakruti-assessment/things-to-avoid", prakruti, listCoachUserPrakrutiThingsToAvoidController);
router.get("/:userId/prakruti-assessment/questions", prakruti, listCoachUserPrakrutiQuestionsController);
router.get("/:userId/prakruti-assessment/recommendations", prakruti, listCoachUserPrakrutiRecommendationsController);
router.get("/:userId/prakruti-assessment/export", staff("console.body.export", { admin: "users.clientHub.assessments.prakruti-assessment", coach: "clientTab.assessments.prakruti-assessment" }), exportCoachUserPrakrutiQuestionsController);
router.get("/:userId/prakruti-assessment", prakruti, getCoachUserPrakrutiAssessmentController);
router.post("/:userId/prakruti-assessment", prakrutiWrite, saveCoachUserPrakrutiAssessmentController);

const hp = staff("console.body.view", { admin: "users.clientHub.tracking.health-progress", coach: "clientTab.tracking.health-progress" });
const hpWrite = staff("console.body.edit", { admin: "users.clientHub.tracking.health-progress", coach: "clientTab.tracking.health-progress" });
router.get("/:userId/health-progress-settings", hp, getCoachHealthProgressSettingsController);
router.patch("/:userId/health-progress-settings", hpWrite, updateCoachHealthProgressSettingsController);
router.get("/:userId/health-progress/weight", hp, listCoachWeightLogsController);
router.post("/:userId/health-progress/weight", hpWrite, optionalHealthProgressWeightPicFile, createCoachWeightLogController);
router.get("/:userId/health-progress/glucose", hp, listCoachGlucoseLogsController);
router.get("/:userId/health-progress/blood-pressure", hp, listCoachBloodPressureLogsController);
router.get("/:userId/health-progress/menstrual-cycle", hp, listCoachMenstrualCycleLogsController);
router.get("/:userId/health-progress/condition-comparison", hp, listCoachConditionLogsController);

const meta = staff("console.body.view", { admin: "users.clientHub.metabolic-health.metabolic-metrics", coach: "clientTab.metabolic-health.metabolic-metrics" });
const metaWrite = staff("console.body.edit", { admin: "users.clientHub.metabolic-health.metabolic-metrics", coach: "clientTab.metabolic-health.metabolic-metrics" });
router.get("/:userId/metabolic-metrics/dashboard", meta, getCoachMetabolicMetricsDashboardController);
router.get("/:userId/metabolic-metrics/history", meta, listCoachMetabolicMetricHistoryController);
router.get("/:userId/metabolic-metrics/history/:metricType", meta, listCoachMetabolicMetricHistoryController);
router.post("/:userId/metabolic-metrics/fatty-liver", metaWrite, createCoachFattyLiverMetricController);

const reflection = staff("console.diet.view", { admin: "users.clientHub.wellness.daily-reflection", coach: "clientTab.wellness.daily-reflection" });
const reflectionWrite = staff("console.diet.edit", { admin: "users.clientHub.wellness.daily-reflection", coach: "clientTab.wellness.daily-reflection" });
router.get("/:userId/daily-reflection-settings", reflection, getCoachUserDailyReflectionSettingsController);
router.patch("/:userId/daily-reflection-settings", reflectionWrite, updateCoachUserDailyReflectionSettingsController);
router.post("/:userId/daily-reflection", reflectionWrite, submitCoachUserDailyReflectionController);
router.post("/:userId/daily-reflection/bedtime-push", reflectionWrite, pushCoachUserDailyReflectionBedtimeController);
router.get("/:userId/daily-reflection/history", reflection, getCoachUserDailyReflectionHistoryController);

router.patch(
  "/:userId/onboarding-steps/:stepKey",
  staff("console.cl.edit", { admin: "users.edit", coach: "clientTab.overview" }),
  patchUserOnboardingStepController
);
router.post(
  "/:userId/onboarding-reminder",
  staff("console.cl.edit", { admin: "users.edit", coach: "clientTab.overview" }),
  pushUserOnboardingReminderController
);

const onboardMeet = staff("console.cal.view", { admin: "users.clientHub.care.consultancy", coach: "clientTab.care.consultancy" });
const onboardMeetWrite = staff("console.cal.edit", { admin: "users.clientHub.care.consultancy", coach: "clientTab.care.consultancy" });
router.get("/:userId/onboarding-meetings", onboardMeet, listStaffOnboardingMeetingsController);
router.post("/:userId/onboarding-meetings", onboardMeetWrite, createStaffOnboardingMeetingController);
router.post("/:userId/onboarding-meetings/:meetingId/accept-request", onboardMeetWrite, acceptOnboardingMeetingRequestController);
router.post("/:userId/onboarding-meetings/:meetingId/reject-request", onboardMeetWrite, rejectOnboardingMeetingRequestController);
router.post("/:userId/onboarding-meetings/:meetingId/cancel", onboardMeetWrite, cancelStaffOnboardingMeetingController);

router.get("/:userId/rca", tests, listStaffUserRcaController);
router.post("/:userId/rca", testsWrite, optionalUserFile, submitStaffUserRcaController);
router.get("/:userId/protocol", tests, listStaffUserProtocolController);
router.post("/:userId/protocol", testsWrite, saveStaffUserProtocolController);

const commitmentLetter = staff("console.diet.view", { admin: "users.clientHub.care.commitment-letter", coach: "clientTab.care.commitment-letter" });
const commitmentLetterWrite = staff("console.diet.edit", { admin: "users.clientHub.care.commitment-letter", coach: "clientTab.care.commitment-letter" });
router.get("/:userId/commitment-letter", commitmentLetter, getCoachUserCommitmentLetterController);
router.patch("/:userId/commitment-letter/:letterId/review", commitmentLetterWrite, reviewCoachCommitmentLetterController);

const presentablePicView = staff("console.cl.view", { admin: "users.view", coach: "clientTab.overview" });
const presentablePicReview = staff("console.cl.edit", { admin: "users.edit", coach: "clientTab.overview" });
router.get("/:userId/presentable-pic/download", presentablePicView, downloadPresentablePicController);
router.patch("/:userId/presentable-pics/settings", presentablePicReview, patchPresentablePicsSettingsController);
router.post("/:userId/presentable-pic/request", presentablePicReview, requestPresentablePicController);
router.patch("/:userId/presentable-pic/review", presentablePicReview, reviewPresentablePicController);
router.delete("/:userId/presentable-pic", presentablePicReview, deletePresentablePicController);

const insight = staff("console.diet.view", { admin: "users.clientHub.care.coach-message", coach: "clientTab.care.coach-message" });
const protocol = staff("console.diet.view", { admin: "users.view", coach: "nav.my-users" });
const protocolWrite = staff("console.diet.edit", { admin: "users.edit", coach: "nav.my-users" });
router.get("/:userId/protocol-settings", protocol, getStaffUserProtocolSettingsController);
router.post("/:userId/protocol-settings", protocolWrite, saveStaffUserProtocolSettingsController);

const gutReset = staff("console.diet.view", { admin: "users.view", coach: "nav.my-users" });
const gutResetWrite = staff(["console.diet.edit", "console.diet.create"], { admin: "users.edit", coach: "nav.my-users" });
router.get("/:userId/gut-resets", gutReset, getStaffUserGutResetsController);
router.post("/:userId/gut-resets", gutResetWrite, saveStaffUserGutResetController);

router.get("/:userId/coach-insight", insight, getCoachUserCoachInsightController);
router.put("/:userId/coach-insight", staff("console.diet.edit", { admin: "users.clientHub.care.coach-message", coach: "clientTab.care.coach-message" }), upsertCoachUserCoachInsightController);

const tracks = staff("console.cal.view", { admin: "users.clientHub.care.consultancy", coach: "clientTab.care.consultancy" });
const tracksWrite = staff("console.cal.edit", { admin: "users.clientHub.care.consultancy", coach: "clientTab.care.consultancy" });
router.get("/:userId/heal-consultancy-tracks", tracks, listCoachHealConsultancyTracksController);
router.post("/:userId/heal-consultancy-tracks", tracksWrite, createCoachHealConsultancyTrackController);
router.patch("/:userId/heal-consultancy-tracks/:trackId/offer-periods", tracksWrite, offerCoachHealConsultancyPeriodsController);
router.patch("/:userId/heal-consultancy-tracks/:trackId/confirm-time", tracksWrite, confirmCoachHealConsultancyTimeController);
router.patch("/:userId/heal-consultancy-tracks/:trackId", tracksWrite, updateCoachHealConsultancyTrackController);
router.delete("/:userId/heal-consultancy-tracks/:trackId", staff("console.cal.delete", { admin: "users.clientHub.care.consultancy", coach: "clientTab.care.consultancy" }), deleteCoachHealConsultancyTrackController);

router.get("/:id", staff("console.cl.view", { admin: "users.view", coach: "nav.my-users" }), getHealUserForStaffController);

module.exports = router;
