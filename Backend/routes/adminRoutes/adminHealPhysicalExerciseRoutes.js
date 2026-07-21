const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserPhysicalExercisesController,
  createAdminUserPhysicalExercisesController,
  deleteAdminUserPhysicalExerciseController,
} = require("../../controllers/adminController/healUser/physicalExerciseAssignmentController.js");

const router = express.Router({ mergeParams: true });

router.get("/:userId/physical-exercises", protectAdmin, authorize("users.clientHub.wellness.physical-exercises"), listAdminUserPhysicalExercisesController);
router.post("/:userId/physical-exercises", protectAdmin, authorize("users.clientHub.wellness.physical-exercises"), createAdminUserPhysicalExercisesController);
router.delete(
  "/:userId/physical-exercises/:assignmentId",
  protectAdmin, authorize("users.clientHub.wellness.physical-exercises"),
  deleteAdminUserPhysicalExerciseController
);

module.exports = router;
