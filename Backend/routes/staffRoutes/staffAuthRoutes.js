const express = require("express");

const { protectStaff } = require("../../middleware/auth");
const { optionalStaffAccountFile } = require("../../middleware/authMultipart");
const {
  loginStaff,
  sendStaffLoginOtp,
  verifyStaffLoginOtp,
  refreshStaffToken,
  getStaffProfile,
  updateStaffProfile,
  changeStaffPassword,
} = require("../../controllers/staffController/authController");

const router = express.Router();

router.post("/login", loginStaff);
router.post("/otp/send", sendStaffLoginOtp);
router.post("/otp/verify", verifyStaffLoginOtp);
router.post("/refresh-token", refreshStaffToken);

router.get("/me", protectStaff(), getStaffProfile);
router.patch("/me", protectStaff(), optionalStaffAccountFile, updateStaffProfile);
router.patch("/me/password", protectStaff(), changeStaffPassword);

module.exports = router;
