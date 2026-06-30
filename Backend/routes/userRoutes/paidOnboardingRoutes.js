const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  requirePaidOnboardingPending,
} = require("../../middleware/tierGuards");
const { optionalUserFile, optionalWeightPicFile } = require("../../middleware/authMultipart");
const {
  getStateController,
  submitProfileController,
  submitBodyMeasurementsController,
  getMedicalQuestionsController,
  submitMedicalConditionsController,
} = require("../../controllers/userController/paidOnboardingController");

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
router.get("/medical-questions", getMedicalQuestionsController);
router.post(
  "/medical-conditions",
  requirePaidOnboardingPending,
  submitMedicalConditionsController
);

module.exports = router;
