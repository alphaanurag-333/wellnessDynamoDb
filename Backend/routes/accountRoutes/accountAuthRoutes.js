const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const {
  loginAccount,
  refreshAccountToken,
  switchAccountRole,
  getAccountMe,
  updateAccountProfile,
  getAccountPermissions,
  changeAccountPassword,
  sendAccountLoginOtp,
  verifyAccountLoginOtp,
  registerCoachAccount,
} = require("../../controllers/accountController/authController");
const { optionalAdminFile } = require("../../middleware/authMultipart");

const router = express.Router();

router.post("/login", loginAccount);
router.post("/refresh-token", refreshAccountToken);
router.post("/otp/send", sendAccountLoginOtp);
router.post("/otp/verify", verifyAccountLoginOtp);
router.post("/register/coach", registerCoachAccount);

router.post("/switch-role", protectAccount, switchAccountRole);
router.get("/me", protectAccount, getAccountMe);
router.patch("/me", protectAccount, optionalAdminFile, updateAccountProfile);
router.get("/me/permissions", protectAccount, getAccountPermissions);
router.patch("/me/password", protectAccount, changeAccountPassword);

// Explicit role-gated ping for smoke tests
router.get(
  "/ping/admin",
  protectAccount,
  requireActiveRole("admin"),
  (req, res) => res.json({ status: true, role: req.auth.role })
);
router.get(
  "/ping/coach",
  protectAccount,
  requireActiveRole("wellness_coach"),
  (req, res) => res.json({ status: true, role: req.auth.role })
);

module.exports = router;
