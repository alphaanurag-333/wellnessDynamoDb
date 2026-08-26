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
  onboardingStepLabel,
} = require("../../utils/paidOnboardingHelpers");
const {
  dispatchOnboardingReminderNotification,
} = require("../../services/notificationDispatchService");
const { sendOnboardingReminderWhatsApp } = require("../../utils/whatsapp");

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

  const savedValue = String(
    updated?.paidOnboardingStepStatus?.[stepKey] || ""
  ).toLowerCase();
  if (status === "done" && savedValue !== "done") {
    throw new AppError(
      `Failed to persist ${stepKey} as done. Check body analytics sub-steps or try again.`,
      500
    );
  }

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

exports.pushUserOnboardingReminderController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const actor = resolveStaffActor(req);
  const user = await loadStaffUser(req);

  const message = String(req.body?.message || "").trim();
  if (message.length > 2000) throw new AppError("message is too long", 400);

  const nextIncompleteStep = getNextIncompleteStep(user.paidOnboardingStepStatus);
  const stepLabel = String(req.body?.stepLabel || nextIncompleteStep || "").trim();
  const channel = String(req.body?.channel || "push").trim().toLowerCase();

  if (channel === "whatsapp") {
    if (!nextIncompleteStep && !stepLabel) {
      throw new AppError("Onboarding is already complete", 400);
    }
    const resolvedStep = onboardingStepLabel(stepLabel || nextIncompleteStep);
    const result = await sendOnboardingReminderWhatsApp({
      user,
      stepLabel: resolvedStep,
    });
    if (!result.sent) {
      const reason = result.reason || "WhatsApp send failed";
      if (reason === "missing_phone") {
        throw new AppError("No WhatsApp number on this client", 400);
      }
      const isConfig =
        reason.includes("BHASHSMS_") ||
        reason.includes("not_configured") ||
        reason.includes("approved utility template");
      throw new AppError(reason, isConfig ? 400 : 502);
    }

    return res.status(200).json({
      status: true,
      message: `WhatsApp sent to ${user.name || "client"}`,
      channel: "whatsapp",
      template: result.template || "gen_rem01",
      to: result.to || null,
      messageId: result.messageId || null,
      stepLabel: resolvedStep || null,
    });
  }

  if (!message) throw new AppError("message is required", 400);

  const { notification, push } = await dispatchOnboardingReminderNotification({
    userId: user.id,
    message,
    stepLabel,
    actorUserId: actor.id,
  });

  const delivered = Boolean(push && !push.skipped && Number(push.successCount) > 0);
  const noDevice = Boolean(push?.skipped && push?.reason === "no_token");

  return res.status(200).json({
    status: true,
    message: delivered
      ? "Reminder pushed to the app"
      : noDevice
        ? "Reminder saved in the app inbox, but this user has no push device registered"
        : "Reminder saved in the app inbox",
    channel: "push",
    notificationId: notification?.id || null,
    push: {
      delivered,
      skipped: Boolean(push?.skipped),
      reason: push?.reason || null,
      successCount: Number(push?.successCount) || 0,
      failureCount: Number(push?.failureCount) || 0,
    },
  });
});
