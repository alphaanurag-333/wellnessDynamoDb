const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById, updateUser } = require("../../models/userModel");
const { enrichUser } = require("../userController/userProfileHelpers");
const { resolveStaffActor, assertStaffCanAccessUser, assertStaffCanMutate } = require("../staffAccess");
const {
  PAID_ONBOARDING_STATUS_KEYS,
  setCanonicalStepStatus,
  getNextIncompleteStep,
  countCompletedSteps,
  computePaidOnboardingCompleted,
} = require("../../utils/paidOnboardingHelpers");

function readUserId(req) {
  return String(req.params.userId || req.params.id || "").trim();
}

function readStepKey(req) {
  return String(req.params.stepKey || "").trim();
}

async function loadStaffUser(req) {
  const userId = readUserId(req);
  if (!userId) throw new AppError("userId is required", 400);
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);
  return user;
}

function buildOnboardingPayload(user) {
  const stepStatus = user.paidOnboardingStepStatus;
  return {
    paidOnboardingStepStatus: stepStatus,
    paidOnboardingCompleted: Boolean(user.paidOnboardingCompleted),
    completedStepsCount: countCompletedSteps(stepStatus),
    totalStepsCount: PAID_ONBOARDING_STATUS_KEYS.length,
    nextIncompleteStep: getNextIncompleteStep(stepStatus),
  };
}

exports.patchUserOnboardingStepController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const actor = resolveStaffActor(req);
  const user = await loadStaffUser(req);
  const stepKey = readStepKey(req);
  if (!PAID_ONBOARDING_STATUS_KEYS.includes(stepKey)) {
    throw new AppError(
      `stepKey must be one of: ${PAID_ONBOARDING_STATUS_KEYS.join(", ")}`,
      400
    );
  }

  const status = String(req.body?.status || "done").toLowerCase().trim();
  if (status !== "done" && status !== "pending") {
    throw new AppError("status must be done or pending", 400);
  }

  let nextStatus;
  try {
    nextStatus = setCanonicalStepStatus(user.paidOnboardingStepStatus, stepKey, status, {
      sequential: status === "done",
    });
  } catch (err) {
    if (err?.name === "SequentialStepError") {
      throw new AppError(err.message, 400);
    }
    throw new AppError(err.message, 400);
  }

  const updated = await updateUser(user.id, {
    paidOnboardingStepStatus: nextStatus,
    paidOnboardingCompleted: computePaidOnboardingCompleted(nextStatus),
  });

  return res.status(200).json({
    status: true,
    message: status === "done" ? `${stepKey} marked done` : `${stepKey} reopened`,
    data: {
      ...buildOnboardingPayload(updated),
      updatedBy: { id: actor.id, role: actor.role, name: actor.displayName },
      user: await enrichUser(updated),
    },
  });
});

exports.getUserOnboardingStateController = asyncHandler(async (req, res) => {
  const user = await loadStaffUser(req);
  return res.status(200).json({
    status: true,
    message: "Onboarding state fetched",
    data: buildOnboardingPayload(user),
  });
});
