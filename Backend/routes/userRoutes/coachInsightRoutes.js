const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const { getMyCoachInsightController } = require("../../controllers/userController/coachInsightController");

const router = express.Router();

router.use(protectUser, requireHealTier, forbidEagleClient);
router.get("/", getMyCoachInsightController);

module.exports = router;
