const express = require("express");

const { protectStaff } = require("../../middleware/auth");
const { requireSuperAdmin } = require("../../middleware/authorize");
const { getStaffPermissionCatalog } = require("../../config/staffPermissionCatalog");

const router = express.Router();

// Super Admin only — powers the unified Role editor's checkbox tree.
// ?accountType=admin|wellness_coach|assistant_wellness_coach|staff filters the
// module list to what's assignable to that account type; omit for the full catalog.
router.get("/", protectStaff(), requireSuperAdmin, (req, res) => {
  const accountType = Array.isArray(req.query.accountType) ? req.query.accountType[0] : req.query.accountType;
  const catalog = getStaffPermissionCatalog({ accountType });
  return res.status(200).json({
    status: true,
    message: "Permission catalog fetched successfully",
    ...catalog,
  });
});

module.exports = router;
