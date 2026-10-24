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
  markStepSkipped,
  wizardStepAfterSkip,
  computePaidOnboardingCompleted,
} = require("../../utils/paidOnboardingHelpers");

exports.getUserMedicalConditionsAdminController = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const medical = await getLatestMedicalConditionForUser(userId);

  return res.status(200).json({
    status: true,
    message: "User medical conditions fetched",
    medicalCondition: toPublicMedicalCondition(medical),
    medicalConditionsInAppEnabled: isMedicalConditionsInAppEnabled(user),
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

  const updates = { medicalConditionsInAppEnabled: enabled };

  if (!enabled) {
    const currentStatus = normalizePaidOnboardingStepStatus(user.paidOnboardingStepStatus);
    if (currentStatus.medicalConditions === "pending") {
      const nextStatus = markStepSkipped(currentStatus, "medicalConditions");
      updates.paidOnboardingStepStatus = nextStatus;
      const nextWizardStep = wizardStepAfterSkip(user.paidOnboardingStep, "medicalConditions");
      if (nextWizardStep && nextWizardStep !== user.paidOnboardingStep) {
        updates.paidOnboardingStep = nextWizardStep;
      }
      updates.paidOnboardingCompleted = computePaidOnboardingCompleted(nextStatus);
    }
  }

  const updated = await updateUser(userId, updates);

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
