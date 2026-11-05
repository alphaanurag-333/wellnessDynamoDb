const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const { assertStaffCanAccessUser } = require("../staffAccess");
const { buildAtAGlanceForUser } = require("../../services/adminAtAGlanceService");
const {
  syncBodyAnalyticsOnboardingFromClientData,
  attachBodyAnalyticsAdminMeta,
} = require("../../services/bodyAnalyticsOnboardingSyncService");
const {
  normalizePaidOnboardingStepStatus,
  countCompletedSteps,
} = require("../../utils/paidOnboardingHelpers");

exports.getUserAtAGlanceController = asyncHandler(async (req, res) => {
  const userId = String(req.params.id || "").trim();
  if (!userId) throw new AppError("User id is required", 400);

  let user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  user = await syncBodyAnalyticsOnboardingFromClientData(user);
  user = await attachBodyAnalyticsAdminMeta(user);
  const stepStatus = normalizePaidOnboardingStepStatus(user.paidOnboardingStepStatus);

  const glance = await buildAtAGlanceForUser(userId);
  if (!glance) throw new AppError("User not found", 404);

  return res.status(200).json({
    status: true,
    message: "At a glance fetched",
    glance,
    paidOnboardingStepStatus: stepStatus,
    paidOnboardingCompleted: Boolean(user.paidOnboardingCompleted),
    completedStepsCount: countCompletedSteps(stepStatus),
    bodyAnalyticsClientDataReady: Boolean(user.bodyAnalyticsClientDataReady),
  });
});
