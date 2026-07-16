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
  protectWellnessCoach, authorize("clientTab.care.consultancy"),
  listCoachHealConsultancyTracksController
);
router.post(
  "/:userId/heal-consultancy-tracks",
  protectWellnessCoach, authorize("clientTab.care.consultancy"),
  createCoachHealConsultancyTrackController
);
router.patch(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectWellnessCoach, authorize("clientTab.care.consultancy"),
  updateCoachHealConsultancyTrackController
);
router.delete(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectWellnessCoach, authorize("clientTab.care.consultancy"),
  deleteCoachHealConsultancyTrackController
);

module.exports = router;
