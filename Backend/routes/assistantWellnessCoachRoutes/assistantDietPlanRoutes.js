const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const { optionalDietPlanFile } = require("../../middleware/authMultipart");
const {
  listAssistantUserDietPlansController,
  createAssistantUserDietPlanController,
  deleteAssistantUserDietPlanController,
} = require("../../controllers/assistantWellnessCoachController/dietPlanController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/diet-plans", protectAssistantWellnessCoach, listAssistantUserDietPlansController);
router.post(
  "/:userId/diet-plans",
  protectAssistantWellnessCoach,
  optionalDietPlanFile,
  createAssistantUserDietPlanController
);
router.delete(
  "/:userId/diet-plans/:planId",
  protectAssistantWellnessCoach,
  deleteAssistantUserDietPlanController
);

module.exports = router;
