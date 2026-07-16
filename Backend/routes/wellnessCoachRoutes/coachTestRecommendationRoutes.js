const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachUserTestRecommendationsController,
  createCoachUserTestRecommendationController,
  deleteCoachUserTestRecommendationController,
  listCoachUserLabReportsController,
} = require("../../controllers/wellnessCoachController/testRecommendationController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/test-recommendations", protectWellnessCoach, authorize("clientTab.care.internal-parameters"), listCoachUserTestRecommendationsController);
router.post("/:userId/test-recommendations", protectWellnessCoach, authorize("clientTab.care.internal-parameters"), createCoachUserTestRecommendationController);
router.get("/:userId/lab-reports", protectWellnessCoach, authorize("clientTab.care.internal-parameters"), listCoachUserLabReportsController);
router.delete(
  "/:userId/test-recommendations/:recommendationId",
  protectWellnessCoach, authorize("clientTab.care.internal-parameters"),
  deleteCoachUserTestRecommendationController
);

module.exports = router;
