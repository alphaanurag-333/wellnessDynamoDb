const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachUserPhysicalExercisesController,
  createCoachUserPhysicalExercisesController,
  deleteCoachUserPhysicalExerciseController,
} = require("../../controllers/wellnessCoachController/physicalExerciseAssignmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/physical-exercises", protectWellnessCoach, authorize("clientTab.wellness.physical-exercises"), listCoachUserPhysicalExercisesController);
router.post("/:userId/physical-exercises", protectWellnessCoach, authorize("clientTab.wellness.physical-exercises"), createCoachUserPhysicalExercisesController);
router.delete(
  "/:userId/physical-exercises/:assignmentId",
  protectWellnessCoach, authorize("clientTab.wellness.physical-exercises"),
  deleteCoachUserPhysicalExerciseController
);

module.exports = router;
