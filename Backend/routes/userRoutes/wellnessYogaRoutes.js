const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  getUserAssignedWellnessYogaController,
} = require("../../controllers/userController/wellnessYogaController");

const router = express.Router();

router.get("/assigned", protectUser, requireHealTier, getUserAssignedWellnessYogaController);

module.exports = router;
