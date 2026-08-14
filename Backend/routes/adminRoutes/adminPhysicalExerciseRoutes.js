const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalPhysicalExerciseFile } = require("../../middleware/authMultipart");
const {
  listPhysicalExerciseController,
  getPhysicalExerciseByIdController,
  createPhysicalExerciseController,
  updatePhysicalExerciseController,
  deletePhysicalExerciseController,
} = require("../../controllers/adminController/physicalExerciseController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "physical-exercises.view" }), listPhysicalExerciseController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "physical-exercises.view" }), getPhysicalExerciseByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "physical-exercises.edit" }),
  optionalPhysicalExerciseFile,
  createPhysicalExerciseController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "physical-exercises.edit" }),
  optionalPhysicalExerciseFile,
  updatePhysicalExerciseController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "physical-exercises.delete" }),
  deletePhysicalExerciseController
);

module.exports = router;
