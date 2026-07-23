const { asyncHandler } = require("../../utils/asyncHandler");
const { unifiedListToLegacyCoachMap } = require("../../config/staffPermissionSlugMap");

/**
 * GET /coach/auth/me/permissions — resolved boolean map for the logged-in coach.
 *
 * `req.auth.permissions` is already the resolved *unified* slug list — set by
 * `protectWellnessCoach` (legacy or `protectStaff`, see
 * `Backend/middleware/auth.js`) — translated back to the legacy
 * `{ "nav.dashboard": true, ... }` boolean-map shape this endpoint has always
 * returned, so the pre-M7 frontend's `CoachPermissionsProvider` keeps working
 * unchanged.
 */
exports.getCoachPermissionsController = asyncHandler(async (req, res) => {
  const permissions = unifiedListToLegacyCoachMap(req.auth?.permissions);
  return res.status(200).json({
    status: true,
    message: "Permissions fetched successfully",
    roleId: req.auth?.roleId || null,
    permissions,
  });
});
