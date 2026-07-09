const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listHealUsersForCoachPortalController,
  reassignHealUserForCoachPortalController,
} = require("../../controllers/adminController/userAssignmentController");
const { getCoachHealUserWaterTrackingController } = require("../../controllers/waterTrackingHistoryController");
const { getCoachHealUserStepsTrackingController } = require("../../controllers/stepsTrackingHistoryController");
const { getCoachHealUserSleepTrackingController } = require("../../controllers/sleepTrackingHistoryController");
const { getCoachHealUserHeartRateTrackingController } = require("../../controllers/heartRateTrackingHistoryController");

const router = express.Router();

router.get("/", protectWellnessCoach, listHealUsersForCoachPortalController);
router.get("/:id/water-tracking", protectWellnessCoach, getCoachHealUserWaterTrackingController);
router.get("/:id/steps-tracking", protectWellnessCoach, getCoachHealUserStepsTrackingController);
router.get("/:id/sleep-tracking", protectWellnessCoach, getCoachHealUserSleepTrackingController);
router.get("/:id/heart-rate-tracking", protectWellnessCoach, getCoachHealUserHeartRateTrackingController);
router.post("/:id/reassign", protectWellnessCoach, reassignHealUserForCoachPortalController);

module.exports = router;
