const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const {
  getUserWellnessPrescriptionsController,
  getUserReviewHistoryController,
} = require("../../controllers/userController/wellnessPrescriptionController");

const router = express.Router();

router.get("/review-history", protectUser, requireHealTier, forbidEagleClient, getUserReviewHistoryController);
router.get("/", protectUser, requireHealTier, forbidEagleClient, getUserWellnessPrescriptionsController);

module.exports = router;
