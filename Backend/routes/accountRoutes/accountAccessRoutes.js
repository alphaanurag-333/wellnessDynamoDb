const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { requireSuperAdmin, requireTeamsReadAccess } = require("../../middleware/authorize");
const {
  deleteAccountHandler,
} = require("../../controllers/accountController/accountAdminController");
const {
  getAccessCatalog,
  listAccessRoles,
  createAccessRole,
  listAccessPolicies,
  createAccessPolicy,
  updateAccessPolicy,
  deleteAccessPolicy,
  attachAccessPolicy,
  updateAccessRole,
  deleteAccessRole,
  listAccessMembers,
  getAccessMember,
  setAccessMemberRole,
  setAccessMemberPermissions,
  listAccessApprovals,
  approveAccessRequest,
  rejectAccessRequest,
  listAccessAuditLog,
  ensureConsoleRolesSeeded,
} = require("../../controllers/accountController/accessController");
const { asyncHandler } = require("../../utils/asyncHandler");

const router = express.Router();

router.use(protectAccount);

const requireAccessAdmin = [requireActiveRole("admin"), requireSuperAdmin];

/** Access Control catalog / role mutations — Super Admin only */
router.get("/catalog", ...requireAccessAdmin, getAccessCatalog);
router.post("/roles", ...requireAccessAdmin, createAccessRole);
router.get("/policies", ...requireAccessAdmin, listAccessPolicies);
router.post("/policies", ...requireAccessAdmin, createAccessPolicy);
router.patch("/policies/:id", ...requireAccessAdmin, updateAccessPolicy);
router.delete("/policies/:id", ...requireAccessAdmin, deleteAccessPolicy);
router.post("/policies/:id/attachments", ...requireAccessAdmin, attachAccessPolicy);
router.patch("/roles/:id", ...requireAccessAdmin, updateAccessRole);
router.delete("/roles/:id", ...requireAccessAdmin, deleteAccessRole);
router.patch("/members/:id/role", ...requireAccessAdmin, setAccessMemberRole);
router.patch("/members/:id/permissions", requireTeamsReadAccess, setAccessMemberPermissions);
router.get("/audit-log", ...requireAccessAdmin, listAccessAuditLog);
router.get("/approvals", ...requireAccessAdmin, listAccessApprovals);
router.post("/approvals/:id/approve", ...requireAccessAdmin, approveAccessRequest);
router.post("/approvals/:id/reject", ...requireAccessAdmin, rejectAccessRequest);
router.post(
  "/seed",
  ...requireAccessAdmin,
  asyncHandler(async (req, res) => {
    const result = await ensureConsoleRolesSeeded();
    res.json({ status: true, message: "Console roles ensured", ...result, byKey: undefined });
  })
);

/** Teams directory reads — Admin + Wellness Coach (nav includes Teams) */
router.get(
  "/roles",
  requireTeamsReadAccess,
  asyncHandler(async (req, res, next) => {
    await ensureConsoleRolesSeeded();
    return listAccessRoles(req, res, next);
  })
);
router.get(
  "/members",
  requireTeamsReadAccess,
  asyncHandler(async (req, res, next) => {
    await ensureConsoleRolesSeeded();
    return listAccessMembers(req, res, next);
  })
);
router.get("/members/:id", requireTeamsReadAccess, getAccessMember);
router.post("/members/:id/delete", ...requireAccessAdmin, deleteAccountHandler);
router.delete("/members/:id", ...requireAccessAdmin, deleteAccountHandler);

module.exports = router;
