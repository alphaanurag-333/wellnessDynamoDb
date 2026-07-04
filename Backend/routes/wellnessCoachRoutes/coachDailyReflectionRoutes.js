const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  getCoachUserDailyReflectionSettingsController,
  updateCoachUserDailyReflectionSettingsController,
  getCoachUserDailyReflectionHistoryController,
} = require("../../controllers/wellnessCoachController/dailyReflectionController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/daily-reflection-settings",
  protectWellnessCoach,
  getCoachUserDailyReflectionSettingsController
);
router.patch(
  "/:userId/daily-reflection-settings",
  protectWellnessCoach,
  updateCoachUserDailyReflectionSettingsController
);
router.get(
  "/:userId/daily-reflection/history",
  protectWellnessCoach,
  getCoachUserDailyReflectionHistoryController
);

module.exports = router;
