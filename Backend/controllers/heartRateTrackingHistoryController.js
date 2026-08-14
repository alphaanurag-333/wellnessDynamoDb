const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { getUserById } = require("../models/userModel");
const { getUserHeartRateSummary } = require("../models/heartRateTrackingModel");
const { enrichUser } = require("./userController/userProfileHelpers");
const { normalizeUserTier } = require("../models/userAssignmentLogic");
const { assertStaffCanAccessUser } = require("./staffAccess");

function toHistoryUser(user) {
  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    userTier: normalizeUserTier(user.userTier),
  };
}

async function fetchHeartRateHistory(userId, query) {
  const days = Math.min(Math.max(Number(query.days) || 7, 1), 90);
  const date = query.date ? String(query.date).trim() : undefined;

  return getUserHeartRateSummary(userId, { date, days });
}

exports.getUserHeartRateTrackingHistoryController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const data = await fetchHeartRateHistory(userId, req.query);

  return res.status(200).json({
    status: true,
    message: "Heart rate tracking history fetched",
    user: toHistoryUser(user),
    data,
  });
});

exports.getStaffHealUserHeartRateTrackingController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const data = await fetchHeartRateHistory(userId, req.query);
  const enriched = await enrichUser(user);

  return res.status(200).json({
    status: true,
    message: "Heart rate tracking history fetched",
    user: toHistoryUser(enriched),
    data,
  });
});

exports.getCoachHealUserHeartRateTrackingController = exports.getStaffHealUserHeartRateTrackingController;
exports.getAssistantHealUserHeartRateTrackingController = exports.getStaffHealUserHeartRateTrackingController;
