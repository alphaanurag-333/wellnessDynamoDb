const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantUserDietPlanAssignmentsController,
  createAssistantUserDietPlanAssignmentController,
  deleteAssistantUserDietPlanAssignmentController,
} = require("../../controllers/assistantWellnessCoachController/dietPlanCatalogAssignmentController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/diet-plan-assignments",
  protectAssistantWellnessCoach,
  listAssistantUserDietPlanAssignmentsController
);
router.post(
  "/:userId/diet-plan-assignments",
  protectAssistantWellnessCoach,
  createAssistantUserDietPlanAssignmentController
);
router.delete(
  "/:userId/diet-plan-assignments/:assignmentId",
  protectAssistantWellnessCoach,
  deleteAssistantUserDietPlanAssignmentController
);

module.exports = router;
