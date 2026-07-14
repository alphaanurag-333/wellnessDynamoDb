const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  adminGetUserMealTrackingController,
  adminDeleteMealLogController,
} = require("../../controllers/adminController/mealTrackingController");

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

module.exports = router;
