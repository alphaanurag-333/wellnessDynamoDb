const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalMealPhotoFile } = require("../../middleware/authMultipart");
const {
  listAdminUserMealTrackingController,
  createAdminUserMealLogController,
  updateAdminUserMealLogController,
  deleteAdminUserMealLogController,
  updateAdminUserMealTrackingModeController,
} = require("../../controllers/adminController/healUser/mealTrackingController.js");

const router = express.Router({ mergeParams: true });

router.get("/:userId/meal-tracking", protectAdmin, authorize("users.clientHub.tracking.meal-tracking"), listAdminUserMealTrackingController);
router.post(
  "/:userId/meal-tracking",
  protectAdmin, authorize("users.clientHub.tracking.meal-tracking"),
  optionalMealPhotoFile,
  createAdminUserMealLogController
);
router.put(
  "/:userId/meal-tracking/:logId",
  protectAdmin, authorize("users.clientHub.tracking.meal-tracking"),
  optionalMealPhotoFile,
  updateAdminUserMealLogController
);
router.delete(
  "/:userId/meal-tracking/:logId",
  protectAdmin, authorize("users.clientHub.tracking.meal-tracking"),
  deleteAdminUserMealLogController
);
router.patch(
  "/:userId/meal-tracking-mode",
  protectAdmin, authorize("users.clientHub.tracking.meal-tracking"),
  updateAdminUserMealTrackingModeController
);

module.exports = router;
