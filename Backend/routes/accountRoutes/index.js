const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const accountAuthRoutes = require("./accountAuthRoutes");
const accountHealUserRoutes = require("./accountHealUserRoutes");
const accountAccessRoutes = require("./accountAccessRoutes");
const {
  listAccountsHandler,
  getAccountHandler,
  createAccountHandler,
  grantMembershipHandler,
  revokeMembershipHandler,
} = require("../../controllers/accountController/accountAdminController");

// Admin CMS modules — each already applies protectAdmin (Account-aware when dual-read/auth flags on)
const adminRoleRoutes = require("../adminRoutes/adminRoleRoutes");
const adminPermissionRoutes = require("../adminRoutes/adminPermissionRoutes");
const adminSubAdminRoutes = require("../adminRoutes/adminSubAdminRoutes");
const adminSopRoutes = require("../adminRoutes/adminSopRoutes");
const adminAppConfigRoutes = require("../adminRoutes/adminAppConfigRoutes");
const adminUserRoutes = require("../adminRoutes/adminUserRoutes");
const adminWellnessCoachRoutes = require("../adminRoutes/adminWellnessCoachRoutes");
const adminBannerRoutes = require("../adminRoutes/adminBannerRoutes");
const adminDashboardRoutes = require("../adminRoutes/adminDashboardRoutes");

const router = express.Router();

router.use("/auth", accountAuthRoutes);
router.use("/heal-users", accountHealUserRoutes);
router.use("/access", accountAccessRoutes);

router.get("/accounts", protectAccount, requireActiveRole("admin"), listAccountsHandler);
router.post("/accounts", protectAccount, requireActiveRole("admin"), createAccountHandler);
router.get("/accounts/:id", protectAccount, requireActiveRole("admin"), getAccountHandler);
router.post(
  "/accounts/:id/memberships",
  protectAccount,
  requireActiveRole("admin"),
  grantMembershipHandler
);
router.delete(
  "/accounts/:id/memberships/:roleKey",
  protectAccount,
  requireActiveRole("admin"),
  revokeMembershipHandler
);

// Nested admin CMS (legacy protectAdmin still runs inside these routers)
router.use("/admin/roles", adminRoleRoutes);
router.use("/admin/permissions", adminPermissionRoutes);
router.use("/admin/sub-admins", adminSubAdminRoutes);
router.use("/admin/sops", adminSopRoutes);
router.use("/admin/app-config", adminAppConfigRoutes);
router.use("/admin/users", adminUserRoutes);
router.use("/admin/wellness-coaches", adminWellnessCoachRoutes);
router.use("/admin/banners", adminBannerRoutes);
router.use("/admin/dashboard", adminDashboardRoutes);

module.exports = router;
