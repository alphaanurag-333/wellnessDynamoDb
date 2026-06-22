const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listHealUsersForCoachPortalController,
  reassignHealUserForCoachPortalController,
} = require("../../controllers/adminController/userAssignmentController");
const { getCoachHealUserWaterTrackingController } = require("../../controllers/waterTrackingHistoryController");
const { getCoachHealUserStepsTrackingController } = require("../../controllers/stepsTrackingHistoryController");

const router = express.Router();

router.get("/", protectWellnessCoach, listHealUsersForCoachPortalController);
router.get("/:id/water-tracking", protectWellnessCoach, getCoachHealUserWaterTrackingController);
router.get("/:id/steps-tracking", protectWellnessCoach, getCoachHealUserStepsTrackingController);
router.post("/:id/reassign", protectWellnessCoach, reassignHealUserForCoachPortalController);

module.exports = router;
