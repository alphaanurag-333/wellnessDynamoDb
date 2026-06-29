const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  adminGetUserMealTrackingController,
  adminDeleteMealLogController,
} = require("../../controllers/adminController/mealTrackingController");

const router = express.Router();

router.get("/users/:userId/meal-tracking", protectAdmin, adminGetUserMealTrackingController);
router.delete("/users/:userId/meal-tracking/:logId", protectAdmin, adminDeleteMealLogController);

module.exports = router;
