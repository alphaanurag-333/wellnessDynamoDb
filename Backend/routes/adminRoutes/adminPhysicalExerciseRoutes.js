const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalPhysicalExerciseFile } = require("../../middleware/authMultipart");
const {
  listPhysicalExerciseController,
  getPhysicalExerciseByIdController,
  createPhysicalExerciseController,
  updatePhysicalExerciseController,
  deletePhysicalExerciseController,
} = require("../../controllers/adminController/physicalExerciseController");

const router = express.Router();

router.get("/", protectAdmin, authorize("physical-exercises.view"), listPhysicalExerciseController);
router.get("/:id", protectAdmin, authorize("physical-exercises.view"), getPhysicalExerciseByIdController);
router.post(
  "/",
  protectAdmin,
  authorize("physical-exercises.edit"),
  optionalPhysicalExerciseFile,
  createPhysicalExerciseController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("physical-exercises.edit"),
  optionalPhysicalExerciseFile,
  updatePhysicalExerciseController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("physical-exercises.delete"),
  deletePhysicalExerciseController
);

module.exports = router;
