const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { getUserById } = require("../models/userModel");
const { getUserHeartRateSummary } = require("../models/heartRateTrackingModel");
const { enrichUser } = require("./userController/userProfileHelpers");
const { normalizeUserTier } = require("../models/userAssignmentLogic");

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

exports.getCoachHealUserHeartRateTrackingController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub || req.user?.id;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (String(user.parentCoachId || "") !== String(actingCoachId)) {
    throw new AppError("User is not under your coaching hierarchy", 403);
  }

  const data = await fetchHeartRateHistory(userId, req.query);
  const enriched = await enrichUser(user);

  return res.status(200).json({
    status: true,
    message: "Heart rate tracking history fetched",
    user: toHistoryUser(enriched),
    data,
  });
});

exports.getAssistantHealUserHeartRateTrackingController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub || req.user?.id;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (String(user.assignedCoachId || "") !== String(assistantId)) {
    throw new AppError("User is not assigned to you", 403);
  }

  const data = await fetchHeartRateHistory(userId, req.query);
  const enriched = await enrichUser(user);

  return res.status(200).json({
    status: true,
    message: "Heart rate tracking history fetched",
    user: toHistoryUser(enriched),
    data,
  });
});
