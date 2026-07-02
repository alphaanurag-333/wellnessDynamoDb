const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  getUserWellnessPrescriptionsController,
} = require("../../controllers/userController/wellnessPrescriptionController");

const router = express.Router();

router.get("/", protectUser, requireHealTier, getUserWellnessPrescriptionsController);

module.exports = router;
