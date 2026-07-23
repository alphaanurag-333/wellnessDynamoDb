const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  getCoachUserDailyReflectionSettingsController,
  updateCoachUserDailyReflectionSettingsController,
  getCoachUserDailyReflectionHistoryController,
} = require("../../controllers/wellnessCoachController/dailyReflectionController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/daily-reflection-settings",
  protectWellnessCoach, authorize("clientHub.wellness.daily-reflection"),
  getCoachUserDailyReflectionSettingsController
);
router.patch(
  "/:userId/daily-reflection-settings",
  protectWellnessCoach, authorize("clientHub.wellness.daily-reflection"),
  updateCoachUserDailyReflectionSettingsController
);
router.get(
  "/:userId/daily-reflection/history",
  protectWellnessCoach, authorize("clientHub.wellness.daily-reflection"),
  getCoachUserDailyReflectionHistoryController
);

module.exports = router;
