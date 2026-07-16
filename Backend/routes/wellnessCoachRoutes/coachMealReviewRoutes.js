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
  authorize("nav.meal-approvals"),
  listPendingMealLogsController
);
router.patch(
  "/:logId/review",
  protectWellnessCoach,
  authorize("nav.meal-approvals"),
  reviewMealLogController
);

module.exports = router;
