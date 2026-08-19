const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { getUserById } = require("../models/userModel");
const { getUserSleepSummary } = require("../models/sleepTrackingModel");
const { historyRangeFromQuery } = require("../utils/dateOnly");
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

async function fetchSleepHistory(userId, query) {
  const { date, days } = historyRangeFromQuery(query, { defaultDays: 14, maxDays: 366 });
  return getUserSleepSummary(userId, { date, days });
}

exports.getUserSleepTrackingHistoryController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const data = await fetchSleepHistory(userId, req.query);

  return res.status(200).json({
    status: true,
    message: "Sleep tracking history fetched",
    user: toHistoryUser(user),
    data,
  });
});

exports.getStaffHealUserSleepTrackingController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const data = await fetchSleepHistory(userId, req.query);
  const enriched = await enrichUser(user);

  return res.status(200).json({
    status: true,
    message: "Sleep tracking history fetched",
    user: toHistoryUser(enriched),
    data,
  });
});

exports.getCoachHealUserSleepTrackingController = exports.getStaffHealUserSleepTrackingController;
exports.getAssistantHealUserSleepTrackingController = exports.getStaffHealUserSleepTrackingController;
