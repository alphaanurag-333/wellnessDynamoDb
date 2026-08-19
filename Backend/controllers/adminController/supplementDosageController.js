const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createUserSupplementDosage,
  listUserSupplementDosagesByUserId,
  stopUserSupplementDosage,
  normalizeStartDate,
  normalizePeriods,
} = require("../../models/userSupplementDosageModel");
const { getSupplementById } = require("../../models/supplementModel");
const {
  queryLogsByDosageId,
  queryLogsByUserIdAndDate,
  computeProgressPercent,
  buildTodayCompletionMap,
  normalizeLogDate,
} = require("../../models/userSupplementDosageLogModel");
const {
  dispatchSupplementDosageAssignedNotification,
} = require("../../services/notificationDispatchService");
const {
  readUserIdParam,
  readDosageIdParam,
  parseDosagePeriods,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadDosageForUser,
} = require("../helpers/supplementControllerHelpers");

async function hydrateDosagesWithProgress(dosages, userId) {
  const logDate = normalizeLogDate();
  const todayLogs = await queryLogsByUserIdAndDate(userId, logDate);
  return Promise.all(
    (dosages || []).map(async (dosage) => {
      const logs = await queryLogsByDosageId(dosage.id);
      const todayCompletion = buildTodayCompletionMap(dosage, todayLogs, logDate);
      return {
        ...dosage,
        progressPercent: computeProgressPercent(dosage, logs),
        todayCompletion,
        periods: (dosage.periods || []).map((row) => ({
          ...row,
          completed: todayCompletion[row.period] === true,
        })),
      };
    })
  );
}

exports.listCoachUserSupplementDosagesController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const dosages = await listUserSupplementDosagesByUserId(userId);
  const hydrated = await hydrateDosagesWithProgress(dosages, userId);

  return res.status(200).json({
    status: true,
    message: "Supplement dosages fetched successfully",
    dosages: hydrated,
  });
});

exports.createCoachUserSupplementDosageController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
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
      coachId: resolveCoachIdForUser(user, actingCoachId),
      supplementId,
      name: supplement.name,
      unit: supplement.unit,
      packSize: supplement.packSize,
      startDate,
      periods,
      createdByRole: req.auth?.role || "wellness_coach",
      createdById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const coach = { id: actingCoachId, name: resolveStaffActor(req).displayName };
  dispatchSupplementDosageAssignedNotification({
    userId,
    coachName: coach?.name || "Your coach",
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

exports.deleteCoachUserSupplementDosageController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const dosageId = readDosageIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
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
