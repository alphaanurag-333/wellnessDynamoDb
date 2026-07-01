const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachUserSupplementRecommendationsController,
  createCoachUserSupplementRecommendationController,
  deleteCoachUserSupplementRecommendationController,
} = require("../../controllers/wellnessCoachController/supplementRecommendationController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/supplement-recommendations",
  protectWellnessCoach,
  listCoachUserSupplementRecommendationsController
);
router.post(
  "/:userId/supplement-recommendations",
  protectWellnessCoach,
  createCoachUserSupplementRecommendationController
);
router.delete(
  "/:userId/supplement-recommendations/:recommendationId",
  protectWellnessCoach,
  deleteCoachUserSupplementRecommendationController
);

module.exports = router;
