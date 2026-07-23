const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachUserDietPlanAssignmentsController,
  createCoachUserDietPlanAssignmentController,
  deleteCoachUserDietPlanAssignmentController,
} = require("../../controllers/wellnessCoachController/dietPlanCatalogAssignmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/diet-plan-assignments", protectWellnessCoach, authorize("clientHub.care.diet-plan"), listCoachUserDietPlanAssignmentsController);
router.post("/:userId/diet-plan-assignments", protectWellnessCoach, authorize("clientHub.care.diet-plan"), createCoachUserDietPlanAssignmentController);
router.delete(
  "/:userId/diet-plan-assignments/:assignmentId",
  protectWellnessCoach, authorize("clientHub.care.diet-plan"),
  deleteCoachUserDietPlanAssignmentController
);

module.exports = router;
