const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const { getMyCoachInsightController } = require("../../controllers/userController/coachInsightController");

const router = express.Router();

router.use(protectUser, requireHealTier);
router.get("/", getMyCoachInsightController);

module.exports = router;
