const express = require("express");

const { protectWellnessCoach } = require("../../middleware/auth");
const { optionalWellnessCoachFile } = require("../../middleware/authMultipart");
const {
  registerWellnessCoach,
  loginWellnessCoach,
  sendWellnessCoachLoginOtp,
  verifyWellnessCoachLoginOtp,
  refreshWellnessCoachToken,
  getWellnessCoachProfile,
  updateWellnessCoachProfile,
  changeWellnessCoachPassword,
} = require("../../controllers/wellnessCoachController/authController");

const router = express.Router();

router.post("/register", registerWellnessCoach);
router.post("/login", loginWellnessCoach);
router.post("/otp/send", sendWellnessCoachLoginOtp);
router.post("/otp/verify", verifyWellnessCoachLoginOtp);
router.post("/refresh-token", refreshWellnessCoachToken);

router.get("/me", protectWellnessCoach, getWellnessCoachProfile);
router.patch("/me", protectWellnessCoach, optionalWellnessCoachFile, updateWellnessCoachProfile);
router.patch("/me/password", protectWellnessCoach, changeWellnessCoachPassword);

module.exports = router;
