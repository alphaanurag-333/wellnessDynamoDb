const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantHealConsultancyTracksController,
  createAssistantHealConsultancyTrackController,
  updateAssistantHealConsultancyTrackController,
  deleteAssistantHealConsultancyTrackController,
} = require("../../controllers/assistantWellnessCoachController/healConsultancyTrackController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/heal-consultancy-tracks",
  protectAssistantWellnessCoach,
  listAssistantHealConsultancyTracksController
);
router.post(
  "/:userId/heal-consultancy-tracks",
  protectAssistantWellnessCoach,
  createAssistantHealConsultancyTrackController
);
router.patch(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectAssistantWellnessCoach,
  updateAssistantHealConsultancyTrackController
);
router.delete(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectAssistantWellnessCoach,
  deleteAssistantHealConsultancyTrackController
);

module.exports = router;
