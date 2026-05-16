const express = require("express");

const { protectUser } = require("../../middleware/auth");
const {
  registerUser,
  loginWithPassword,
  loginUser,
  sendLoginOtp,
  verifyLoginOtp,
  refreshUserToken,
  getUserProfile,
} = require("../../controllers/userController/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/login/password", loginWithPassword);
router.post("/otp/send", sendLoginOtp);
router.post("/otp/verify", verifyLoginOtp);
router.post("/refresh-token", refreshUserToken);

router.get("/me", protectUser, getUserProfile);

module.exports = router;
