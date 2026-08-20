const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const {
  getUserAssignedExercisesController,
} = require("../../controllers/userController/physicalExerciseController");

const router = express.Router();

router.get("/assigned", protectUser, requireHealTier, forbidEagleClient, getUserAssignedExercisesController);

module.exports = router;
