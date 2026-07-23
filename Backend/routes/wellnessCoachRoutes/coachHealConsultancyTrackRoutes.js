const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachHealConsultancyTracksController,
  createCoachHealConsultancyTrackController,
  updateCoachHealConsultancyTrackController,
  deleteCoachHealConsultancyTrackController,
} = require("../../controllers/wellnessCoachController/healConsultancyTrackController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/heal-consultancy-tracks",
  protectWellnessCoach, authorize("clientHub.care.consultancy"),
  listCoachHealConsultancyTracksController
);
router.post(
  "/:userId/heal-consultancy-tracks",
  protectWellnessCoach, authorize("clientHub.care.consultancy"),
  createCoachHealConsultancyTrackController
);
router.patch(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectWellnessCoach, authorize("clientHub.care.consultancy"),
  updateCoachHealConsultancyTrackController
);
router.delete(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectWellnessCoach, authorize("clientHub.care.consultancy"),
  deleteCoachHealConsultancyTrackController
);

module.exports = router;
