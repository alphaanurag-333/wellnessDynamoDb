const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const {
  getUserAssignedWellnessYogaController,
} = require("../../controllers/userController/wellnessYogaController");

const router = express.Router();

router.get("/assigned", protectUser, requireHealTier, forbidEagleClient, getUserAssignedWellnessYogaController);

module.exports = router;
