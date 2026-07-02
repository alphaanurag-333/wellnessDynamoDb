const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  getAssistantUserDailyReflectionSettingsController,
} = require("../../controllers/assistantWellnessCoachController/dailyReflectionController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/daily-reflection-settings",
  protectAssistantWellnessCoach,
  getAssistantUserDailyReflectionSettingsController
);

module.exports = router;
