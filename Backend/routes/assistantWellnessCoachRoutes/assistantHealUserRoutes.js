const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const { listHealUsersForAssistantPortalController } = require("../../controllers/adminController/userAssignmentController");
const { getAssistantHealUserWaterTrackingController } = require("../../controllers/waterTrackingHistoryController");

const router = express.Router();

router.get("/", protectAssistantWellnessCoach, listHealUsersForAssistantPortalController);
router.get("/:id/water-tracking", protectAssistantWellnessCoach, getAssistantHealUserWaterTrackingController);

module.exports = router;
