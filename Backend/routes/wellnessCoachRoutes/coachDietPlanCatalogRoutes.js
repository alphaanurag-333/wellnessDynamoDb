const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachUserDietPlanAssignmentsController,
  createCoachUserDietPlanAssignmentController,
  deleteCoachUserDietPlanAssignmentController,
} = require("../../controllers/wellnessCoachController/dietPlanCatalogAssignmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/diet-plan-assignments", protectWellnessCoach, listCoachUserDietPlanAssignmentsController);
router.post("/:userId/diet-plan-assignments", protectWellnessCoach, createCoachUserDietPlanAssignmentController);
router.delete(
  "/:userId/diet-plan-assignments/:assignmentId",
  protectWellnessCoach,
  deleteCoachUserDietPlanAssignmentController
);

module.exports = router;
