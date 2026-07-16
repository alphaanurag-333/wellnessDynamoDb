const { asyncHandler } = require("../../utils/asyncHandler");
const {
  resolveCoachPermissions,
} = require("../../utils/coachPermissions");

/**
 * GET /coach/auth/me/permissions — resolved boolean map for the logged-in coach.
 */
exports.getCoachPermissionsController = asyncHandler(async (req, res) => {
  const permissions = await resolveCoachPermissions(req.user, { req });
  return res.status(200).json({
    status: true,
    message: "Permissions fetched successfully",
    roleId: req.user?.roleId || null,
    permissions,
  });
});
