const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listPendingMealLogsController,
  reviewMealLogController,
} = require("../../controllers/wellnessCoachController/mealReviewController");

const router = express.Router();

router.get("/pending-review", protectWellnessCoach, listPendingMealLogsController);
router.patch("/:logId/review", protectWellnessCoach, reviewMealLogController);

module.exports = router;
