const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const { getMyPrakrutiAssessmentController } = require("../../controllers/userController/prakrutiAssessmentController");

const router = express.Router();

router.get("/", protectUser, requireHealTier, forbidEagleClient, getMyPrakrutiAssessmentController);

module.exports = router;
