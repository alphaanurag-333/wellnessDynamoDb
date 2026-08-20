const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const {
  getUserAssignedMentalWellbeingController,
} = require("../../controllers/userController/mentalWellbeingController");

const router = express.Router();

router.get("/assigned", protectUser, requireHealTier, forbidEagleClient, getUserAssignedMentalWellbeingController);

module.exports = router;
