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
// "profile" is never permission-gated (same rule as admin, see
// Backend/config/staffPermissionSlugMap.js) — every authenticated coach can
// manage their own profile/password regardless of role permissions.
router.patch("/me", protectWellnessCoach, optionalWellnessCoachFile, updateWellnessCoachProfile);
router.patch("/me/password", protectWellnessCoach, changeWellnessCoachPassword);

module.exports = router;
