const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getUserById,
  updateUser,
  isMedicalConditionsInAppEnabled,
} = require("../../models/userModel");
const {
  getLatestMedicalConditionForUser,
  toPublicMedicalCondition,
} = require("../../models/userMedicalConditionModel");
const { assertStaffCanAccessUser, assertStaffCanMutate } = require("../staffAccess");
const { enrichUser } = require("../userController/userProfileHelpers");
const {
  normalizePaidOnboardingStepStatus,
  countCompletedSteps,
} = require("../../utils/paidOnboardingHelpers");
const {
  syncBodyAnalyticsOnboardingFromClientData,
  attachBodyAnalyticsAdminMeta,
} = require("../../services/bodyAnalyticsOnboardingSyncService");
const { notifyClientProfileFromReq } = require("../../services/clientProfileRealtime");

exports.getUserMedicalConditionsAdminController = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  let user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const medical = await getLatestMedicalConditionForUser(userId);
  user = await syncBodyAnalyticsOnboardingFromClientData(user);
  user = await attachBodyAnalyticsAdminMeta(user);
  const stepStatus = normalizePaidOnboardingStepStatus(user.paidOnboardingStepStatus);

  return res.status(200).json({
    status: true,
    message: "User medical conditions fetched",
    medicalCondition: toPublicMedicalCondition(medical),
    medicalConditionsInAppEnabled: isMedicalConditionsInAppEnabled(user),
    paidOnboardingStepStatus: stepStatus,
    paidOnboardingCompleted: Boolean(user.paidOnboardingCompleted),
    completedStepsCount: countCompletedSteps(stepStatus),
    bodyAnalyticsClientDataReady: Boolean(user.bodyAnalyticsClientDataReady),
  });
});

exports.approveUserMedicalConditionsController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const userId = String(req.params.id || "").trim();
  if (!userId) throw new AppError("User id is required", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const medical = await getLatestMedicalConditionForUser(userId);
  if (!medical) {
    throw new AppError("No medical condition answers to approve", 400);
  }

  const currentStatus = normalizePaidOnboardingStepStatus(user.paidOnboardingStepStatus);

  return res.status(200).json({
    status: true,
    message: "Medical conditions reviewed",
    paidOnboardingStepStatus: currentStatus,
    paidOnboardingCompleted: Boolean(user.paidOnboardingCompleted),
    completedStepsCount: countCompletedSteps(currentStatus),
    user: await enrichUser(user),
  });
});

exports.patchMedicalConditionsInAppSettingsController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const userId = String(req.params.id || "").trim();
  if (!userId) throw new AppError("User id is required", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  if (req.body.enabled === undefined && req.body.medicalConditionsInAppEnabled === undefined) {
    throw new AppError("enabled is required", 400);
  }

  const raw =
    req.body.enabled !== undefined
      ? req.body.enabled
      : req.body.medicalConditionsInAppEnabled;
  const enabled =
    raw === true || raw === false
      ? raw
      : String(raw).trim().toLowerCase() === "true"
        ? true
        : String(raw).trim().toLowerCase() === "false"
          ? false
          : null;
  if (enabled == null) {
    throw new AppError("enabled must be true or false", 400);
  }

  const updated = await updateUser(userId, { medicalConditionsInAppEnabled: enabled });

  notifyClientProfileFromReq(req, userId, "medical", "medicalConditionsSettings.updated", { enabled });

  return res.status(200).json({
    status: true,
    message: enabled
      ? "Medical conditions are visible in the client app"
      : "Medical conditions are hidden from the client app",
    enabled: isMedicalConditionsInAppEnabled(updated),
    medicalConditionsInAppEnabled: isMedicalConditionsInAppEnabled(updated),
    user: await enrichUser(updated),
  });
});
