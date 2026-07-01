const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  getMyLaunchScoresController,
  getMyLaunchAssessmentByDateController,
  getMyLaunchAssessmentByIdController,
} = require("../../controllers/userController/launchAssessmentController");

const router = express.Router();

router.get("/scores", protectUser, requireHealTier, getMyLaunchScoresController);
router.get("/by-date", protectUser, requireHealTier, getMyLaunchAssessmentByDateController);
router.get("/:assessmentId", protectUser, requireHealTier, getMyLaunchAssessmentByIdController);

module.exports = router;
