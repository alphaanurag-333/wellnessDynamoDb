const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { assertCanAccessClient } = require("../utils/clientOwnership");

/**
 * For routes with :userId — ensure panel account may access that client.
 * Admins always pass inside assertCanAccessClient.
 */
const requireClientAccess = asyncHandler(async (req, _res, next) => {
  const userId = String(req.params.userId || "").trim();
  if (!userId) {
    throw new AppError("userId is required", 400);
  }
  req.clientUser = await assertCanAccessClient(req.auth, userId);
  next();
});

module.exports = { requireClientAccess };
