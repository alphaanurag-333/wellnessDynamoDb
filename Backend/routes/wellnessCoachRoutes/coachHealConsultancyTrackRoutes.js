const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachHealConsultancyTracksController,
  createCoachHealConsultancyTrackController,
  updateCoachHealConsultancyTrackController,
  deleteCoachHealConsultancyTrackController,
} = require("../../controllers/wellnessCoachController/healConsultancyTrackController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/heal-consultancy-tracks",
  protectWellnessCoach,
  listCoachHealConsultancyTracksController
);
router.post(
  "/:userId/heal-consultancy-tracks",
  protectWellnessCoach,
  createCoachHealConsultancyTrackController
);
router.patch(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectWellnessCoach,
  updateCoachHealConsultancyTrackController
);
router.delete(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectWellnessCoach,
  deleteCoachHealConsultancyTrackController
);

module.exports = router;
