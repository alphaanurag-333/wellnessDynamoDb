const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listHealUsersForCoachPortalController,
  reassignHealUserForCoachPortalController,
} = require("../../controllers/adminController/userAssignmentController");
const { getCoachHealUserWaterTrackingController } = require("../../controllers/waterTrackingHistoryController");
const { getCoachHealUserStepsTrackingController } = require("../../controllers/stepsTrackingHistoryController");
const { getCoachHealUserSleepTrackingController } = require("../../controllers/sleepTrackingHistoryController");
const { getCoachHealUserHeartRateTrackingController } = require("../../controllers/heartRateTrackingHistoryController");

const router = express.Router();

router.get("/", protectWellnessCoach, authorize("my-users.view"), listHealUsersForCoachPortalController);
router.get(
  "/:id/water-tracking",
  protectWellnessCoach,
  authorize("clientHub.tracking.water"),
  getCoachHealUserWaterTrackingController
);
router.get(
  "/:id/steps-tracking",
  protectWellnessCoach,
  authorize("clientHub.tracking.steps"),
  getCoachHealUserStepsTrackingController
);
router.get(
  "/:id/sleep-tracking",
  protectWellnessCoach,
  authorize("clientHub.tracking"),
  getCoachHealUserSleepTrackingController
);
router.get(
  "/:id/heart-rate-tracking",
  protectWellnessCoach,
  authorize("clientHub.tracking"),
  getCoachHealUserHeartRateTrackingController
);
router.post(
  "/:id/reassign",
  protectWellnessCoach,
  authorize("my-users.view"),
  reassignHealUserForCoachPortalController
);

module.exports = router;
