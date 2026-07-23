const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  adminGetUserMealTrackingController,
  adminDeleteMealLogController,
} = require("../../controllers/adminController/mealTrackingController");
const { adminReviewMealLogController } = require("../../controllers/adminController/healUser/mealReviewController");

const router = express.Router();

// Nested under the Users module (AdminUserMealTrackingPage) — no dedicated nav leaf.
router.get(
  "/users/:userId/meal-tracking",
  protectAdmin,
  authorize("users.view"),
  adminGetUserMealTrackingController
);
router.delete(
  "/users/:userId/meal-tracking/:logId",
  protectAdmin,
  authorize("users.edit"),
  adminDeleteMealLogController
);
router.patch(
  "/:logId/review",
  protectAdmin,
  authorize("clientHub.tracking.meal-tracking"),
  adminReviewMealLogController
);

module.exports = router;
