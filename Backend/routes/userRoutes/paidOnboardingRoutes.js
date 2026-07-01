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
  requireHealTier,
  optionalWeightPicFile,
  submitBodyMeasurementsController
);
router.post(
  "/progress-photos",
  requireHealTier,
  optionalProgressPhotoFiles,
  createProgressPhotoController
);
router.get("/progress-photos", requireHealTier, listProgressPhotosController);
router.get("/medical-questions", getMedicalQuestionsController);
router.post(
  "/medical-conditions",
  requireHealTier,
  submitMedicalConditionsController
);
router.post("/skip-step", requireHealTier, skipOnboardingStepController);
router.post("/launch/complete", requireHealTier, completeLaunchController);

module.exports = router;
