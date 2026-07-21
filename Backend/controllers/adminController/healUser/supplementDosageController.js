const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  createUserSupplementDosage,
  listUserSupplementDosagesByUserId,
  stopUserSupplementDosage,
  normalizeStartDate,
  normalizePeriods,
} = require("../../../models/userSupplementDosageModel");
const { getSupplementById } = require("../../../models/supplementModel");
const { getAdminById } = require("../../../models/adminModel");
const { getWellnessCoachById } = require("../../../models/wellnessCoachModel");
const {
  queryLogsByDosageId,
  computeProgressPercent,
} = require("../../../models/userSupplementDosageLogModel");
const {
  dispatchSupplementDosageAssignedNotification,
} = require("../../../services/notificationDispatchService");
const {
  readUserIdParam,
  readDosageIdParam,
  parseDosagePeriods,
  loadTargetUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadDosageForUser,
} = require("../../supplementControllerHelpers");

async function hydrateDosagesWithProgress(dosages) {
  return Promise.all(
    (dosages || []).map(async (dosage) => {
      const logs = await queryLogsByDosageId(dosage.id);
      return {
        ...dosage,
        progressPercent: computeProgressPercent(dosage, logs),
      };
    })
  );
}

exports.listAdminUserSupplementDosagesController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);

  const dosages = await listUserSupplementDosagesByUserId(userId);
  const hydrated = await hydrateDosagesWithProgress(dosages);

  return res.status(200).json({
    status: true,
    message: "Supplement dosages fetched successfully",
    dosages: hydrated,
  });
});

exports.createAdminUserSupplementDosageController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);

  const supplementId = String(req.body?.supplementId || "").trim();
  if (!supplementId) throw new AppError("supplementId is required", 400);

  const supplement = await getSupplementById(supplementId);
  if (!supplement || String(supplement.status || "").toLowerCase() !== "active") {
    throw new AppError("Supplement is invalid or inactive", 400);
  }

  const startDate = normalizeStartDate(req.body?.startDate);
  const periods = normalizePeriods(parseDosagePeriods(req.body));

  let dosage;
  try {
    dosage = await createUserSupplementDosage({
      userId,
      coachId: resolveCoachIdForUser(user),
      supplementId,
      name: supplement.name,
      unit: supplement.unit,
      packSize: supplement.packSize,
      startDate,
      periods,
      createdByRole: "admin",
      createdById: adminId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const admin = await getAdminById(adminId);
  const coach = admin?.wellnessCoachId
    ? await getWellnessCoachById(admin.wellnessCoachId)
    : null;
  dispatchSupplementDosageAssignedNotification({
    userId,
    coachName: admin?.name || coach?.name || "Your coach",
    dosageId: dosage?.id,
    supplementName: supplement.name,
  }).catch((err) => {
    console.error("Supplement dosage notification failed:", err?.message || err);
  });

  return res.status(201).json({
    status: true,
    message: "Supplement dosage created successfully",
    dosage: { ...dosage, progressPercent: 0 },
  });
});

exports.deleteAdminUserSupplementDosageController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const dosageId = readDosageIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);
  await loadDosageForUser(dosageId, userId);

  try {
    await stopUserSupplementDosage(dosageId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Supplement dosage not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Supplement dosage stopped successfully",
  });
});
