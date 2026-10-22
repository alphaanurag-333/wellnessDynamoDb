const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createUserSupplementDosage,
  listUserSupplementDosagesByUserId,
  stopUserSupplementDosage,
  publishDraftDosagesForUser,
  normalizeStartDate,
  normalizePeriods,
} = require("../../models/userSupplementDosageModel");
const { getSupplementById } = require("../../models/supplementModel");
const {
  queryLogsByUserIdAndDate,
  computeScheduleProgressPercent,
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
      const todayCompletion = buildTodayCompletionMap(dosage, todayLogs, logDate);
      return {
        ...dosage,
        progressPercent: computeScheduleProgressPercent(dosage, logDate),
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

  const dosages = await listUserSupplementDosagesByUserId(userId, { includeDraft: true });
  const hydrated = await hydrateDosagesWithProgress(dosages, userId);

  return res.status(200).json({
    status: true,
    message: "Nutritions dosages fetched successfully",
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
    throw new AppError("Nutrition is invalid or inactive", 400);
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
      status: "draft",
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Nutrition dosage saved to schedule (not yet in client app)",
    dosage: {
      ...dosage,
      progressPercent: computeScheduleProgressPercent(dosage),
    },
  });
});

exports.publishCoachUserSupplementDosagesController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const published = await publishDraftDosagesForUser(userId);
  if (!published.length) {
    return res.status(200).json({
      status: true,
      message: "No unpublished dosages to push",
      publishedCount: 0,
      dosages: await hydrateDosagesWithProgress(
        await listUserSupplementDosagesByUserId(userId, { includeDraft: true }),
        userId,
      ),
    });
  }

  const coach = { id: actingCoachId, name: resolveStaffActor(req).displayName };
  for (const dosage of published) {
    dispatchSupplementDosageAssignedNotification({
      userId,
      coachName: coach?.name || "Your coach",
      dosageId: dosage?.id,
      supplementName: dosage?.name || "Nutrition",
    }).catch((err) => {
      console.error("Supplement dosage notification failed:", err?.message || err);
    });
  }

  const hydrated = await hydrateDosagesWithProgress(
    await listUserSupplementDosagesByUserId(userId, { includeDraft: true }),
    userId,
  );

  return res.status(200).json({
    status: true,
    message: `Pushed ${published.length} dosage${published.length === 1 ? "" : "s"} to client app`,
    publishedCount: published.length,
    dosages: hydrated,
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
      throw new AppError("Nutrition dosage not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Nutrition dosage stopped successfully",
  });
});
