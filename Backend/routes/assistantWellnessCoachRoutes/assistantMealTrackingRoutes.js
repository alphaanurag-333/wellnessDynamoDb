const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const { optionalMealPhotoFile } = require("../../middleware/authMultipart");
const {
  listAssistantUserMealTrackingController,
  createAssistantUserMealLogController,
  updateAssistantUserMealLogController,
  deleteAssistantUserMealLogController,
} = require("../../controllers/assistantWellnessCoachController/mealTrackingController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/meal-tracking", protectAssistantWellnessCoach, listAssistantUserMealTrackingController);
router.post(
  "/:userId/meal-tracking",
  protectAssistantWellnessCoach,
  optionalMealPhotoFile,
  createAssistantUserMealLogController
);
router.put(
  "/:userId/meal-tracking/:logId",
  protectAssistantWellnessCoach,
  optionalMealPhotoFile,
  updateAssistantUserMealLogController
);
router.delete(
  "/:userId/meal-tracking/:logId",
  protectAssistantWellnessCoach,
  deleteAssistantUserMealLogController
);

module.exports = router;
