const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { optionalMealPhotoFile } = require("../../middleware/authMultipart");
const {
  listCoachUserMealTrackingController,
  createCoachUserMealLogController,
  updateCoachUserMealLogController,
  deleteCoachUserMealLogController,
} = require("../../controllers/wellnessCoachController/mealTrackingController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/meal-tracking", protectWellnessCoach, listCoachUserMealTrackingController);
router.post(
  "/:userId/meal-tracking",
  protectWellnessCoach,
  optionalMealPhotoFile,
  createCoachUserMealLogController
);
router.put(
  "/:userId/meal-tracking/:logId",
  protectWellnessCoach,
  optionalMealPhotoFile,
  updateCoachUserMealLogController
);
router.delete(
  "/:userId/meal-tracking/:logId",
  protectWellnessCoach,
  deleteCoachUserMealLogController
);

module.exports = router;
