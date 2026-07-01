const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const { getMyPrakrutiAssessmentController } = require("../../controllers/userController/prakrutiAssessmentController");

const router = express.Router();

router.get("/", protectUser, requireHealTier, getMyPrakrutiAssessmentController);

module.exports = router;
