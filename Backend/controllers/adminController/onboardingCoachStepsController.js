const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { updateUser } = require("../../models/userModel");
const { assertStaffCanMutate } = require("../staffAccess");
const { assertStaffHealUserAccess } = require("../helpers/dietPlanControllerHelpers");
const { uploadFileFromRequest } = require("../../utils/s3");
const {
  createUserOnboardingRca,
  listUserOnboardingRcasByUserId,
  getLatestUserOnboardingRcaByUserId,
  toPublicRca,
} = require("../../models/userOnboardingRcaModel");
const {
  createUserProtocol,
  listUserProtocolsByUserId,
  getLatestUserProtocolByUserId,
  toPublicProtocol,
} = require("../../models/userProtocolModel");
const {
  markStepDone,
  computePaidOnboardingCompleted,
} = require("../../utils/paidOnboardingHelpers");
const { notifyOnboardingWhatsAppTransitions } = require("../../services/whatsappJourneyService");

async function persistStepDone(user, stepKey) {
  const previousStatus = user.paidOnboardingStepStatus;
  const nextStatus = markStepDone(user.paidOnboardingStepStatus, stepKey);
  const updated = await updateUser(user.id, {
    paidOnboardingStepStatus: nextStatus,
    paidOnboardingCompleted: computePaidOnboardingCompleted(nextStatus),
  });
  notifyOnboardingWhatsAppTransitions({
    user: updated || user,
    previousStatus,
    nextStatus,
  });
  return updated;
}

exports.listStaffUserRcaController = asyncHandler(async (req, res) => {
  const { userId } = await assertStaffHealUserAccess(req, { requireHealTier: true });
  const items = await listUserOnboardingRcasByUserId(userId);
  return res.status(200).json({
    status: true,
    message: "RCA history fetched",
    rca: toPublicRca(await getLatestUserOnboardingRcaByUserId(userId)),
    history: items.map(toPublicRca),
  });
});

exports.submitStaffUserRcaController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const { userId, user, actor } = await assertStaffHealUserAccess(req, {
    requireHealTier: true,
  });
  const notes = String(req.body?.notes || "").trim();
  if (!notes) throw new AppError("notes is required", 400);

  let fileKey = null;
  if (req.file?.buffer) {
    fileKey = await uploadFileFromRequest(req, "user-onboarding-rca");
  }

  let rca;
  try {
    rca = await createUserOnboardingRca({
      userId,
      notes,
      fileKey,
      submittedById: actor.id,
      submittedByRole: actor.role,
      submittedByName: actor.displayName,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  await persistStepDone(user, "rca");

  return res.status(201).json({
    status: true,
    message: "RCA submitted",
    rca: toPublicRca(rca),
  });
});

exports.listStaffUserProtocolController = asyncHandler(async (req, res) => {
  const { userId } = await assertStaffHealUserAccess(req, { requireHealTier: true });
  const items = await listUserProtocolsByUserId(userId);
  return res.status(200).json({
    status: true,
    message: "Protocol fetched",
    protocol: toPublicProtocol(await getLatestUserProtocolByUserId(userId)),
    history: items.map(toPublicProtocol),
  });
});

exports.saveStaffUserProtocolController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const { userId, user, actor } = await assertStaffHealUserAccess(req, {
    requireHealTier: true,
  });
  const latest = await getLatestUserProtocolByUserId(userId);
  const version = (Number(latest?.version) || 0) + 1;

  let protocol;
  try {
    protocol = await createUserProtocol({
      userId,
      version,
      points: req.body?.points,
      savedById: actor.id,
      savedByRole: actor.role,
      savedByName: actor.displayName,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  if (!latest) {
    await persistStepDone(user, "protocolSettings");
  }

  return res.status(201).json({
    status: true,
    message: "Protocol saved",
    protocol: toPublicProtocol(protocol),
  });
});
