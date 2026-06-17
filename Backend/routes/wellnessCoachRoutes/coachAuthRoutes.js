const express = require("express");

const { protectWellnessCoach } = require("../../middleware/auth");
const { optionalWellnessCoachFile } = require("../../middleware/authMultipart");
const {
  loginWellnessCoach,
  refreshWellnessCoachToken,
  getWellnessCoachProfile,
  updateWellnessCoachProfile,
  changeWellnessCoachPassword,
} = require("../../controllers/wellnessCoachController/authController");

const router = express.Router();

router.post("/login", loginWellnessCoach);
router.post("/refresh-token", refreshWellnessCoachToken);

router.get("/me", protectWellnessCoach, getWellnessCoachProfile);
router.patch("/me", protectWellnessCoach, optionalWellnessCoachFile, updateWellnessCoachProfile);
router.patch("/me/password", protectWellnessCoach, changeWellnessCoachPassword);

module.exports = router;
