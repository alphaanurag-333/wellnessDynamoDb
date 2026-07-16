const express = require("express");

const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
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
const {
  getCoachPermissionsController,
} = require("../../controllers/wellnessCoachController/permissionsController");

const router = express.Router();

router.post("/register", registerWellnessCoach);
router.post("/login", loginWellnessCoach);
router.post("/otp/send", sendWellnessCoachLoginOtp);
router.post("/otp/verify", verifyWellnessCoachLoginOtp);
router.post("/refresh-token", refreshWellnessCoachToken);

router.get("/me/permissions", protectWellnessCoach, getCoachPermissionsController);
router.get("/me", protectWellnessCoach, getWellnessCoachProfile);
router.patch(
  "/me",
  protectWellnessCoach,
  authorize("nav.profile"),
  optionalWellnessCoachFile,
  updateWellnessCoachProfile
);
router.patch(
  "/me/password",
  protectWellnessCoach,
  authorize("nav.profile"),
  changeWellnessCoachPassword
);

module.exports = router;
