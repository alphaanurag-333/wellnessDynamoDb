const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize, authorizeAny } = require("../../middleware/authorize");
const {
  adminGetUserMealTrackingController,
  adminDeleteMealLogController,
} = require("../../controllers/adminController/mealTrackingController");
const {
  adminReviewMealLogController,
  adminListPendingMealLogsController,
} = require("../../controllers/adminController/healUser/mealReviewController");

const router = express.Router();

router.get(
  "/pending-review",
  protectAdmin,
  authorize("meal-approvals.view"),
  adminListPendingMealLogsController
);

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
  authorizeAny("meal-approvals.edit", "users.clientHub.tracking.meal-tracking"),
  adminReviewMealLogController
);

module.exports = router;
