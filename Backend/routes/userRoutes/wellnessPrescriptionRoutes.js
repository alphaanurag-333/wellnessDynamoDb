const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const {
  getUserWellnessPrescriptionsController,
} = require("../../controllers/userController/wellnessPrescriptionController");

const router = express.Router();

router.get("/", protectUser, requireHealTier, forbidEagleClient, getUserWellnessPrescriptionsController);

module.exports = router;
