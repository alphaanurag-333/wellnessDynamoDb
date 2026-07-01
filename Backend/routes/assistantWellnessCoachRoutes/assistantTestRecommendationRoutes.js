const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantUserTestRecommendationsController,
  createAssistantUserTestRecommendationController,
  deleteAssistantUserTestRecommendationController,
  listAssistantUserLabReportsController,
} = require("../../controllers/assistantWellnessCoachController/testRecommendationController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/test-recommendations",
  protectAssistantWellnessCoach,
  listAssistantUserTestRecommendationsController
);
router.post(
  "/:userId/test-recommendations",
  protectAssistantWellnessCoach,
  createAssistantUserTestRecommendationController
);
router.get(
  "/:userId/lab-reports",
  protectAssistantWellnessCoach,
  listAssistantUserLabReportsController
);
router.delete(
  "/:userId/test-recommendations/:recommendationId",
  protectAssistantWellnessCoach,
  deleteAssistantUserTestRecommendationController
);

module.exports = router;
