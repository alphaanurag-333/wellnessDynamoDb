const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachUserSupplementRecommendationsController,
  createCoachUserSupplementRecommendationController,
  deleteCoachUserSupplementRecommendationController,
} = require("../../controllers/wellnessCoachController/supplementRecommendationController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/supplement-recommendations",
  protectWellnessCoach, authorize("clientTab.wellness.supplement-recommendations"),
  listCoachUserSupplementRecommendationsController
);
router.post(
  "/:userId/supplement-recommendations",
  protectWellnessCoach, authorize("clientTab.wellness.supplement-recommendations"),
  createCoachUserSupplementRecommendationController
);
router.delete(
  "/:userId/supplement-recommendations/:recommendationId",
  protectWellnessCoach, authorize("clientTab.wellness.supplement-recommendations"),
  deleteCoachUserSupplementRecommendationController
);

module.exports = router;
