const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const { listHealUsersForAssistantPortalController } = require("../../controllers/adminController/userAssignmentController");
const { getAssistantHealUserWaterTrackingController } = require("../../controllers/waterTrackingHistoryController");
const { getAssistantHealUserStepsTrackingController } = require("../../controllers/stepsTrackingHistoryController");
const { getAssistantHealUserSleepTrackingController } = require("../../controllers/sleepTrackingHistoryController");
const { getAssistantHealUserHeartRateTrackingController } = require("../../controllers/heartRateTrackingHistoryController");

const router = express.Router();

router.get("/", protectAssistantWellnessCoach, listHealUsersForAssistantPortalController);
router.get("/:id/water-tracking", protectAssistantWellnessCoach, getAssistantHealUserWaterTrackingController);
router.get("/:id/steps-tracking", protectAssistantWellnessCoach, getAssistantHealUserStepsTrackingController);
router.get("/:id/sleep-tracking", protectAssistantWellnessCoach, getAssistantHealUserSleepTrackingController);
router.get("/:id/heart-rate-tracking", protectAssistantWellnessCoach, getAssistantHealUserHeartRateTrackingController);

module.exports = router;
