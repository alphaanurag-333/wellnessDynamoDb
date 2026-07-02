const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  getCoachUserDailyReflectionSettingsController,
  updateCoachUserDailyReflectionSettingsController,
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

module.exports = router;
