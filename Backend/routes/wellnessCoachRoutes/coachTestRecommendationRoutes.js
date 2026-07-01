const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachUserTestRecommendationsController,
  createCoachUserTestRecommendationController,
  deleteCoachUserTestRecommendationController,
  listCoachUserLabReportsController,
} = require("../../controllers/wellnessCoachController/testRecommendationController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/test-recommendations", protectWellnessCoach, listCoachUserTestRecommendationsController);
router.post("/:userId/test-recommendations", protectWellnessCoach, createCoachUserTestRecommendationController);
router.get("/:userId/lab-reports", protectWellnessCoach, listCoachUserLabReportsController);
router.delete(
  "/:userId/test-recommendations/:recommendationId",
  protectWellnessCoach,
  deleteCoachUserTestRecommendationController
);

module.exports = router;
