const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listPendingMealLogsController,
  reviewMealLogController,
} = require("../../controllers/assistantWellnessCoachController/mealReviewController");

const router = express.Router();

router.get(
  "/pending-review",
  protectAssistantWellnessCoach,
  listPendingMealLogsController
);
router.patch(
  "/:logId/review",
  protectAssistantWellnessCoach,
  reviewMealLogController
);

module.exports = router;
