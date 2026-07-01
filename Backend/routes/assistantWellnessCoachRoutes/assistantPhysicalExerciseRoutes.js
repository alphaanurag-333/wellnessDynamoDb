const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantUserPhysicalExercisesController,
  createAssistantUserPhysicalExercisesController,
  deleteAssistantUserPhysicalExerciseController,
} = require("../../controllers/assistantWellnessCoachController/physicalExerciseAssignmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/physical-exercises", protectAssistantWellnessCoach, listAssistantUserPhysicalExercisesController);
router.post("/:userId/physical-exercises", protectAssistantWellnessCoach, createAssistantUserPhysicalExercisesController);
router.delete(
  "/:userId/physical-exercises/:assignmentId",
  protectAssistantWellnessCoach,
  deleteAssistantUserPhysicalExerciseController
);

module.exports = router;
