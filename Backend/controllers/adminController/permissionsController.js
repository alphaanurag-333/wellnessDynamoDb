const { asyncHandler } = require("../../utils/asyncHandler");

/**
 * GET /account/me/permissions — console slugs for the logged-in staff Account.
 */
exports.getCoachPermissionsController = asyncHandler(async (req, res) => {
  return res.status(200).json({
    status: true,
    message: "Permissions fetched successfully",
    roleId: req.auth?.roleId || null,
    role: req.auth?.role || null,
    permissions: Array.isArray(req.auth?.permissions) ? req.auth.permissions : [],
  });
});
