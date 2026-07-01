const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantUserSupplementRecommendationsController,
  createAssistantUserSupplementRecommendationController,
  deleteAssistantUserSupplementRecommendationController,
} = require("../../controllers/assistantWellnessCoachController/supplementRecommendationController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/supplement-recommendations",
  protectAssistantWellnessCoach,
  listAssistantUserSupplementRecommendationsController
);
router.post(
  "/:userId/supplement-recommendations",
  protectAssistantWellnessCoach,
  createAssistantUserSupplementRecommendationController
);
router.delete(
  "/:userId/supplement-recommendations/:recommendationId",
  protectAssistantWellnessCoach,
  deleteAssistantUserSupplementRecommendationController
);

module.exports = router;
