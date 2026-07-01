const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachUserPhysicalExercisesController,
  createCoachUserPhysicalExercisesController,
  deleteCoachUserPhysicalExerciseController,
} = require("../../controllers/wellnessCoachController/physicalExerciseAssignmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/physical-exercises", protectWellnessCoach, listCoachUserPhysicalExercisesController);
router.post("/:userId/physical-exercises", protectWellnessCoach, createCoachUserPhysicalExercisesController);
router.delete(
  "/:userId/physical-exercises/:assignmentId",
  protectWellnessCoach,
  deleteCoachUserPhysicalExerciseController
);

module.exports = router;
