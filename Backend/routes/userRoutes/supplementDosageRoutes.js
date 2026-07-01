const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  getUserSupplementDosagesController,
  toggleUserSupplementDosageLogController,
} = require("../../controllers/userController/supplementDosageController");

const router = express.Router();

router.get("/dosages", protectUser, requireHealTier, getUserSupplementDosagesController);
router.post(
  "/dosages/:dosageId/log",
  protectUser,
  requireHealTier,
  toggleUserSupplementDosageLogController
);

module.exports = router;
