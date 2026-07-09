const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachHealConsultancyTracksController,
  updateCoachHealConsultancyTrackController,
} = require("../../controllers/wellnessCoachController/healConsultancyTrackController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/heal-consultancy-tracks",
  protectWellnessCoach,
  listCoachHealConsultancyTracksController
);
router.patch(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectWellnessCoach,
  updateCoachHealConsultancyTrackController
);

module.exports = router;
