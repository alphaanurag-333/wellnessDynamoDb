const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  requirePaidOnboardingPending,
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
router.post(
  "/body-measurements",
  requirePaidOnboardingPending,
  optionalWeightPicFile,
  submitBodyMeasurementsController
);
router.post(
  "/progress-photos",
  requirePaidOnboardingPending,
  optionalProgressPhotoFiles,
  createProgressPhotoController
);
router.get("/progress-photos", requirePaidOnboardingPending, listProgressPhotosController);
router.get("/medical-questions", getMedicalQuestionsController);
router.post(
  "/medical-conditions",
  requirePaidOnboardingPending,
  submitMedicalConditionsController
);
router.post("/skip-step", requirePaidOnboardingPending, skipOnboardingStepController);
router.post("/launch/complete", requireHealTier, completeLaunchController);

module.exports = router;
