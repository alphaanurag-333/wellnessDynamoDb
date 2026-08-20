const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const {
  getMyLaunchScoresController,
  getMyLaunchAssessmentByDateController,
  getMyLaunchAssessmentByIdController,
} = require("../../controllers/userController/launchAssessmentController");

const router = express.Router();

router.get("/scores", protectUser, requireHealTier, forbidEagleClient, getMyLaunchScoresController);
router.get("/by-date", protectUser, requireHealTier, forbidEagleClient, getMyLaunchAssessmentByDateController);
router.get("/:assessmentId", protectUser, requireHealTier, forbidEagleClient, getMyLaunchAssessmentByIdController);

module.exports = router;
