const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantHealConsultancyTracksController,
  updateAssistantHealConsultancyTrackController,
} = require("../../controllers/assistantWellnessCoachController/healConsultancyTrackController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/heal-consultancy-tracks",
  protectAssistantWellnessCoach,
  listAssistantHealConsultancyTracksController
);
router.patch(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectAssistantWellnessCoach,
  updateAssistantHealConsultancyTrackController
);

module.exports = router;
