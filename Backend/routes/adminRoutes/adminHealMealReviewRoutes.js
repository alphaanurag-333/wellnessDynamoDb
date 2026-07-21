const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { adminReviewMealLogController } = require("../../controllers/adminController/healUser/mealReviewController");

const router = express.Router();

router.patch(
  "/:logId/review",
  protectAdmin,
  authorize("users.clientHub.tracking.meal-tracking"),
  adminReviewMealLogController
);

module.exports = router;
