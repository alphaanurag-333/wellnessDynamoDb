const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalPhysicalExerciseFile } = require("../../middleware/authMultipart");
const {
  listPhysicalExerciseController,
  getPhysicalExerciseByIdController,
  createPhysicalExerciseController,
  updatePhysicalExerciseController,
  deletePhysicalExerciseController,
} = require("../../controllers/adminController/physicalExerciseController");

const router = express.Router();

router.get("/", protectAdmin, listPhysicalExerciseController);
router.get("/:id", protectAdmin, getPhysicalExerciseByIdController);
router.post("/", protectAdmin, optionalPhysicalExerciseFile, createPhysicalExerciseController);
router.patch("/:id", protectAdmin, optionalPhysicalExerciseFile, updatePhysicalExerciseController);
router.delete("/:id", protectAdmin, deletePhysicalExerciseController);

module.exports = router;
