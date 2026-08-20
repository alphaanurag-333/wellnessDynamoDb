const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  requirePaidOnboardingPending,
  requirePaidOnboardingAccess,
  requireHealTier,
} = require("../../middleware/tierGuards");
const {
  optionalUserFile,
  optionalWeightPicFile,
  optionalProgressPhotoFiles,
} = require("../../middleware/authMultipart");
const {
  getStateController,
  submitProfileController,
  submitBodyMeasurementsController,
  getMedicalQuestionsController,
  submitMedicalConditionsController,
  skipOnboardingStepController,
  completeLaunchController,
} = require("../../controllers/userController/paidOnboardingController");
const {
  createProgressPhotoController,
  listProgressPhotosController,
} = require("../../controllers/userController/progressPhotoController");

const router = express.Router();

router.use(protectUser);

router.get("/state", getStateController);
router.post(
  "/profile",
  requirePaidOnboardingPending,
  optionalUserFile,
  submitProfileController
);
// Sidebar-editable body analytics: allowed during and after onboarding
router.post(
  "/body-measurements",
  requirePaidOnboardingAccess,
  optionalWeightPicFile,
  submitBodyMeasurementsController
);
router.post(
  "/progress-photos",
  requirePaidOnboardingAccess,
  optionalProgressPhotoFiles,
  createProgressPhotoController
);
router.get("/progress-photos", requirePaidOnboardingAccess, listProgressPhotosController);
router.get("/medical-questions", getMedicalQuestionsController);
router.post(
  "/medical-conditions",
  requirePaidOnboardingAccess,
  submitMedicalConditionsController
);
router.post("/skip-step", requirePaidOnboardingPending, skipOnboardingStepController);
router.post("/launch/complete", requireHealTier, completeLaunchController);

module.exports = router;
