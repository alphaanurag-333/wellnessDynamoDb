const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalMealPhotoFile } = require("../../middleware/authMultipart");
const {
  listCoachUserMealTrackingController,
  createCoachUserMealLogController,
  updateCoachUserMealLogController,
  deleteCoachUserMealLogController,
  updateCoachUserMealTrackingModeController,
} = require("../../controllers/wellnessCoachController/mealTrackingController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/meal-tracking", protectWellnessCoach, authorize("clientHub.tracking.meal-tracking"), listCoachUserMealTrackingController);
router.post(
  "/:userId/meal-tracking",
  protectWellnessCoach, authorize("clientHub.tracking.meal-tracking"),
  optionalMealPhotoFile,
  createCoachUserMealLogController
);
router.put(
  "/:userId/meal-tracking/:logId",
  protectWellnessCoach, authorize("clientHub.tracking.meal-tracking"),
  optionalMealPhotoFile,
  updateCoachUserMealLogController
);
router.delete(
  "/:userId/meal-tracking/:logId",
  protectWellnessCoach, authorize("clientHub.tracking.meal-tracking"),
  deleteCoachUserMealLogController
);
router.patch(
  "/:userId/meal-tracking-mode",
  protectWellnessCoach, authorize("clientHub.tracking.meal-tracking"),
  updateCoachUserMealTrackingModeController
);

module.exports = router;
