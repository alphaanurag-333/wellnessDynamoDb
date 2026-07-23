const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listPendingMealLogsController,
  reviewMealLogController,
} = require("../../controllers/wellnessCoachController/mealReviewController");

const router = express.Router();

router.get(
  "/pending-review",
  protectWellnessCoach,
  authorize("meal-approvals.view"),
  listPendingMealLogsController
);
router.patch(
  "/:logId/review",
  protectWellnessCoach,
  authorize("meal-approvals.view"),
  reviewMealLogController
);

module.exports = router;
