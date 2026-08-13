const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { requireSuperAdmin } = require("../../middleware/authorize");
const {
  getAccessCatalog,
  listAccessRoles,
  createAccessRole,
  updateAccessRole,
  deleteAccessRole,
  listAccessMembers,
  setAccessMemberRole,
  ensureConsoleRolesSeeded,
} = require("../../controllers/accountController/accessController");
const { asyncHandler } = require("../../utils/asyncHandler");

const router = express.Router();

router.use(protectAccount, requireActiveRole("admin"), requireSuperAdmin);

router.get("/catalog", getAccessCatalog);
router.get(
  "/roles",
  asyncHandler(async (req, res, next) => {
    await ensureConsoleRolesSeeded();
    return listAccessRoles(req, res, next);
  })
);
router.post("/roles", createAccessRole);
router.patch("/roles/:id", updateAccessRole);
router.delete("/roles/:id", deleteAccessRole);

router.get(
  "/members",
  asyncHandler(async (req, res, next) => {
    await ensureConsoleRolesSeeded();
    return listAccessMembers(req, res, next);
  })
);
router.patch("/members/:id/role", setAccessMemberRole);

router.post(
  "/seed",
  asyncHandler(async (req, res) => {
    const result = await ensureConsoleRolesSeeded();
    res.json({ status: true, message: "Console roles ensured", ...result, byKey: undefined });
  })
);

module.exports = router;
