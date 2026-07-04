const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  getAssistantUserDailyReflectionSettingsController,
  getAssistantUserDailyReflectionHistoryController,
} = require("../../controllers/assistantWellnessCoachController/dailyReflectionController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/daily-reflection-settings",
  protectAssistantWellnessCoach,
  getAssistantUserDailyReflectionSettingsController
);
router.get(
  "/:userId/daily-reflection/history",
  protectAssistantWellnessCoach,
  getAssistantUserDailyReflectionHistoryController
);

module.exports = router;
