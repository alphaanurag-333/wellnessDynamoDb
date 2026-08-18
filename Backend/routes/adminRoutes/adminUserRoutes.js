const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalUserFile } = require("../../middleware/authMultipart");
const {
  listUsersController,
  getUserByIdController,
  createUserController,
  updateUserController,
  deleteUserController,
} = require("../../controllers/adminController/userController");
const {
  convertUserToHealController,
  convertUserToSeekController,
  convertUserToMaintenanceController,
  convertMaintenanceUserToHealController,
  assignHealUserController,
  reassignHealUserController,
  listPendingAssignmentUsersController,
} = require("../../controllers/adminController/userAssignmentController");
const { getUserWaterTrackingHistoryController } = require("../../controllers/waterTrackingHistoryController");
const { getUserStepsTrackingHistoryController } = require("../../controllers/stepsTrackingHistoryController");
const { getUserSleepTrackingHistoryController } = require("../../controllers/sleepTrackingHistoryController");
const { getUserHeartRateTrackingHistoryController } = require("../../controllers/heartRateTrackingHistoryController");
const {
  getUserEnergyExchangeAdminController,
} = require("../../controllers/adminController/userEnergyExchangeController");
const {
  getUserAtAGlanceController,
} = require("../../controllers/adminController/atAGlanceController");
const {
  patchUserOnboardingStepController,
} = require("../../controllers/adminController/onboardingStepController");
const {
  listStaffOnboardingMeetingsController,
  createStaffOnboardingMeetingController,
  acceptOnboardingMeetingRequestController,
  rejectOnboardingMeetingRequestController,
  cancelStaffOnboardingMeetingController,
} = require("../../controllers/adminController/onboardingMeetingController");
const {
  getUserBodyAnalyticsController,
} = require("../../controllers/adminController/bodyAnalyticsController");

const router = express.Router();

// GET /pending-assignment backs the "Consultancy > Pending Assignment" nav leaf.
router.get(
  "/pending-assignment",
  protectAccount,
  authorizeStaff("console.cal.view", { admin: "consultancy.pending-assignment.view" }),
  listPendingAssignmentUsersController
);

router.get("/", protectAccount, authorizeStaff("console.cl.view", { admin: "users.view" }), listUsersController);
router.get("/:id/at-a-glance", protectAccount, authorizeStaff("console.cl.view", { admin: "users.view" }), getUserAtAGlanceController);
router.get(
  "/:id/body-analytics",
  protectAccount,
  authorizeStaff("console.cl.view", { admin: "users.view" }),
  getUserBodyAnalyticsController
);
router.get("/:id/water-tracking", protectAccount, authorizeStaff("console.cl.view", { admin: "users.view" }), getUserWaterTrackingHistoryController);
router.get("/:id/steps-tracking", protectAccount, authorizeStaff("console.cl.view", { admin: "users.view" }), getUserStepsTrackingHistoryController);
router.get(
  "/:id/sleep-tracking",
  protectAccount,
  authorizeStaff("console.body.view", { admin: "users.clientHub.tracking.health-progress" }),
  getUserSleepTrackingHistoryController
);
router.get(
  "/:id/heart-rate-tracking",
  protectAccount,
  authorizeStaff("console.body.view", { admin: "users.clientHub.tracking.health-progress" }),
  getUserHeartRateTrackingHistoryController
);
router.get(
  "/:id/energy-exchange",
  protectAccount,
  authorizeStaff("console.cl.view", { admin: "users.view" }),
  getUserEnergyExchangeAdminController
);
router.patch(
  "/:id/onboarding-steps/:stepKey",
  protectAccount,
  authorizeStaff("console.cl.edit", { admin: "users.edit" }),
  patchUserOnboardingStepController
);
router.get(
  "/:id/onboarding-meetings",
  protectAccount,
  authorizeStaff("console.cal.view", { admin: "users.view" }),
  listStaffOnboardingMeetingsController
);
router.post(
  "/:id/onboarding-meetings",
  protectAccount,
  authorizeStaff("console.cal.edit", { admin: "users.edit" }),
  createStaffOnboardingMeetingController
);
router.post(
  "/:id/onboarding-meetings/:meetingId/accept-request",
  protectAccount,
  authorizeStaff("console.cal.edit", { admin: "users.edit" }),
  acceptOnboardingMeetingRequestController
);
router.post(
  "/:id/onboarding-meetings/:meetingId/reject-request",
  protectAccount,
  authorizeStaff("console.cal.edit", { admin: "users.edit" }),
  rejectOnboardingMeetingRequestController
);
router.post(
  "/:id/onboarding-meetings/:meetingId/cancel",
  protectAccount,
  authorizeStaff("console.cal.edit", { admin: "users.edit" }),
  cancelStaffOnboardingMeetingController
);
router.get("/:id", protectAccount, authorizeStaff("console.cl.view", { admin: "users.view" }), getUserByIdController);
router.post("/", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), optionalUserFile, createUserController);
router.post("/:id/convert-to-heal", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), convertUserToHealController);
router.post("/:id/convert-to-seek", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), convertUserToSeekController);
router.post("/:id/convert-to-maintenance", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), convertUserToMaintenanceController);
router.post("/:id/maintenance-to-heal", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), convertMaintenanceUserToHealController);
router.post("/:id/assign-coach", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), assignHealUserController);
router.post("/:id/reassign-coach", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), reassignHealUserController);
router.patch("/:id", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), optionalUserFile, updateUserController);
router.delete("/:id", protectAccount, authorizeStaff("console.cl.delete", { admin: "users.delete" }), deleteUserController);

module.exports = router;
