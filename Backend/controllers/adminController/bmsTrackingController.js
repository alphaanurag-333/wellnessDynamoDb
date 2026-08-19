const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  readUserIdParam,
  loadTargetUser,
  assertStaffCanAccessUser,
  updateUser,
  toPublicUser,
} = require("../helpers/healthProgressControllerHelpers");
const {
  isHeartRateEnabled,
  isSleepTrackingEnabled,
} = require("../../models/userModel");

function parseEnabledFlag(raw) {
  if (raw === true || raw === false) return raw;
  const next = String(raw ?? "").trim().toLowerCase();
  if (next === "true") return true;
  if (next === "false") return false;
  return null;
}

exports.updateCoachUserBmsTrackingController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);

  const body = req.body || {};
  const patch = {};

  if (body.heartRateEnabled !== undefined) {
    const enabled = parseEnabledFlag(body.heartRateEnabled);
    if (enabled == null) throw new AppError("heartRateEnabled must be true or false", 400);
    patch.heartRateEnabled = enabled;
  }
  if (body.sleepTrackingEnabled !== undefined) {
    const enabled = parseEnabledFlag(body.sleepTrackingEnabled);
    if (enabled == null) throw new AppError("sleepTrackingEnabled must be true or false", 400);
    patch.sleepTrackingEnabled = enabled;
  }

  if (!Object.keys(patch).length) {
    throw new AppError("Provide heartRateEnabled and/or sleepTrackingEnabled", 400);
  }

  const updated = await updateUser(userId, patch);

  return res.status(200).json({
    status: true,
    message: "BMS tracking visibility updated",
    heartRateEnabled: isHeartRateEnabled(updated),
    sleepTrackingEnabled: isSleepTrackingEnabled(updated),
    user: toPublicUser(updated),
  });
});
