const { asyncHandler } = require("../../utils/asyncHandler");
const { ALL_PERMISSIONS } = require("../../config/permissionCatalog");

/**
 * GET /coach/auth/me/permissions — permission list (+ boolean map for older clients).
 */
exports.getCoachPermissionsController = asyncHandler(async (req, res) => {
  const permissionList = Array.isArray(req.auth?.permissions)
    ? [...req.auth.permissions]
    : [];
  const granted = new Set(permissionList);
  const permissions = {};
  for (const key of ALL_PERMISSIONS) {
    permissions[key] = granted.has(key);
  }

  return res.status(200).json({
    status: true,
    message: "Permissions fetched successfully",
    roleId: req.user?.roleId || req.auth?.roleId || null,
    permissions,
    permissionList,
  });
});
