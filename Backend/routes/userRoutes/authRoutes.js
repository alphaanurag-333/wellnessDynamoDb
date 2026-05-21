const express = require("express");

const { protectUser } = require("../../middleware/auth");
const { optionalUserFile } = require("../../middleware/authMultipart");
const {
  registerUser,
  sendRegisterOtp,
  loginWithPassword,
  loginUser,
  sendLoginOtp,
  verifyLoginOtp,
  refreshUserToken,
  getUserProfile,
  updateUserProfile,
  sendDeleteAccountOtp,
  deleteUserByPhoneOtp,
} = require("../../controllers/userController/authController");

const router = express.Router();

router.post("/register/otp/send", sendRegisterOtp);
router.post("/register", optionalUserFile, registerUser);
router.post("/login", loginUser);
router.post("/login/password", loginWithPassword);
router.post("/otp/send", sendLoginOtp);
router.post("/otp/verify", verifyLoginOtp);
router.post("/refresh-token", refreshUserToken);
router.post("/delete/otp/send", sendDeleteAccountOtp);
router.post("/delete", deleteUserByPhoneOtp);

router.get("/me", protectUser, getUserProfile);
router.patch("/me", protectUser, optionalUserFile, updateUserProfile);

module.exports = router;
