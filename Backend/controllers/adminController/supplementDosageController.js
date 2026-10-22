const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createUserSupplementDosage,
  createScheduledUserSupplementDosage,
  updateScheduledUserSupplementDosage,
  publishUserSupplementDosage,
  listUserSupplementDosagesByUserId,
  stopUserSupplementDosage,
  normalizeStartDate,
  normalizePeriods,
  normalizeDosageUnit,
  normalizeScheduleUnit,
  normalizeFrequency,
  buildSchedulePeriods,
  resolveDosageDisplayUnit,
  formatDosageAmount,
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
  maybeNotifyDosageNearCompleteAsync,
} = require("../../services/dosageProgressAlertService");
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

async function hydrateDosagesWithProgress(dosages, user) {
  const userId = String(user?.id || user?._id || "").trim();
  const logDate = normalizeLogDate();
  const todayLogs = userId ? await queryLogsByUserIdAndDate(userId, logDate) : [];
  return Promise.all(
    (dosages || []).map(async (dosage) => {
      const logs = await queryLogsByDosageId(dosage.id);
      const todayCompletion = buildTodayCompletionMap(dosage, todayLogs, logDate);
      const unit = await resolveDosageDisplayUnit(dosage);
      const progressPercent = computeProgressPercent(dosage, logs);
      maybeNotifyDosageNearCompleteAsync({
        user,
        userId,
        dosage,
        progressPercent,
      });
      return {
        ...dosage,
        unit,
        progressPercent,
        todayCompletion,
        periods: (dosage.periods || []).map((row) => ({
          ...row,
          amountLabel: formatDosageAmount(row.quantity, unit),
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
  const hydrated = await hydrateDosagesWithProgress(dosages, user);

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
    const unit = normalizeDosageUnit(req.body?.unit, supplement.unit);
    dosage = await createUserSupplementDosage({
      userId,
      coachId: resolveCoachIdForUser(user, actingCoachId),
      supplementId,
      name: supplement.name,
      unit,
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
    message: "Nutrition dosage created successfully",
    dosage: { ...dosage, progressPercent: 0 },
  });
});

function readScheduleFields(body) {
  try {
    const schedule = normalizeFrequency(body?.frequency, body?.customIntervalDays ?? body?.intervalDays);
    const dailyQuantity = Math.floor(Number(
      body?.dailyQuantity ?? body?.quantity ?? 0
    ));
    const totalQuantity = Math.floor(Number(
      body?.totalQuantity ?? body?.totalQty ?? 0
    ));
    let periods;
    const rawPeriods = parseDosagePeriods(body);
    if (rawPeriods.length) {
      periods = normalizePeriods(
        rawPeriods.map((row) => ({
          ...row,
          quantity: dailyQuantity > 0
            ? dailyQuantity
            : (Number(row?.quantity) > 0 ? row.quantity : 1),
        }))
      );
    } else {
      const beforeFirstMeal = body?.beforeFirstMeal === true;
      periods = buildSchedulePeriods(body?.timings, dailyQuantity || body?.quantity, beforeFirstMeal);
    }
    const beforeFirstMeal = body?.beforeFirstMeal === true
      || periods.some((row) => String(row.period || "").includes("before_1st_meal"));
    const unit = normalizeScheduleUnit(body?.unit);
    const startDate = normalizeStartDate(body?.startDate);
    return {
      supplementId: String(body?.supplementId || "").trim(),
      periods,
      totalQuantity,
      dailyQuantity: dailyQuantity || Number(periods[0]?.quantity) || 0,
      unit,
      startDate,
      beforeFirstMeal,
      frequency: schedule.frequency,
      intervalDays: schedule.intervalDays,
    };
  } catch (err) {
    handleValidationError(err);
  }
  return null;
}

exports.createCoachUserSupplementDosageBatchController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const rows = Array.isArray(req.body?.dosages) ? req.body.dosages : null;
  if (!rows || rows.length === 0) throw new AppError("At least one dosage is required", 400);
  if (rows.length > 20) throw new AppError("Save at most 20 dosages at once", 400);

  const prepared = [];
  const seen = new Set();
  for (const row of rows) {
    const fields = readScheduleFields(row);
    if (!fields.supplementId) throw new AppError("supplementId is required", 400);
    if (seen.has(fields.supplementId)) {
      throw new AppError("Each nutrition can only be added once", 400);
    }
    seen.add(fields.supplementId);
    const supplement = await getSupplementById(fields.supplementId);
    if (!supplement || String(supplement.status || "").toLowerCase() !== "active") {
      throw new AppError("One or more selected nutritions are invalid or inactive", 400);
    }
    prepared.push({ ...fields, name: supplement.name });
  }

  const existing = await listUserSupplementDosagesByUserId(userId, { includeStopped: false });
  const activeIds = new Set(
    existing
      .filter((row) => String(row.status || "").toLowerCase() !== "stopped")
      .map((row) => row.supplementId)
  );
  for (const row of prepared) {
    if (activeIds.has(row.supplementId)) {
      throw new AppError(`${row.name} already has an active dosage`, 400);
    }
  }

  const dosages = [];
  for (const row of prepared) {
    try {
      const dosage = await createScheduledUserSupplementDosage({
        userId,
        coachId: resolveCoachIdForUser(user, actingCoachId),
        supplementId: row.supplementId,
        name: row.name,
        unit: row.unit,
        startDate: row.startDate,
        periods: row.periods,
        totalQuantity: row.totalQuantity,
        dailyQuantity: row.dailyQuantity,
        frequency: row.frequency,
        intervalDays: row.intervalDays,
        beforeFirstMeal: row.beforeFirstMeal,
        createdByRole: req.auth?.role || "wellness_coach",
        createdById: actingCoachId,
      });
      dosages.push({ ...dosage, progressPercent: 0 });
    } catch (err) {
      handleValidationError(err);
    }
  }

  return res.status(201).json({
    status: true,
    message: "Nutrition dosages saved",
    dosages,
  });
});

exports.updateCoachUserSupplementDosageController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const dosageId = readDosageIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadDosageForUser(dosageId, userId);

  const fields = readScheduleFields(req.body);
  if (!fields.supplementId) throw new AppError("supplementId is required", 400);
  const supplement = await getSupplementById(fields.supplementId);
  if (!supplement || String(supplement.status || "").toLowerCase() !== "active") {
    throw new AppError("Nutrition is invalid or inactive", 400);
  }

  let dosage;
  try {
    dosage = await updateScheduledUserSupplementDosage(dosageId, {
      supplementId: fields.supplementId,
      name: supplement.name,
      unit: fields.unit,
      startDate: fields.startDate,
      periods: fields.periods,
      totalQuantity: fields.totalQuantity,
      dailyQuantity: fields.dailyQuantity,
      frequency: fields.frequency,
      intervalDays: fields.intervalDays,
      beforeFirstMeal: fields.beforeFirstMeal,
    });
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError("Nutrition dosage not found", 404);
    handleValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Nutrition dosage updated",
    dosage,
  });
});

exports.pushCoachUserSupplementDosagesController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const ids = Array.isArray(req.body?.dosageIds)
    ? [...new Set(req.body.dosageIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
  if (!ids.length) throw new AppError("Select at least one dosage to push", 400);

  const coachName = resolveStaffActor(req).displayName || "Your coach";
  const dosages = [];
  for (const dosageId of ids) {
    const record = await loadDosageForUser(dosageId, userId);
    const alreadyLive = record.publishedToApp === true;
    let dosage;
    try {
      dosage = await publishUserSupplementDosage(record.id);
    } catch (err) {
      if (err?.name === "NotFoundError") throw new AppError("Nutrition dosage not found", 404);
      handleValidationError(err);
    }
    if (!alreadyLive) {
      dispatchSupplementDosageAssignedNotification({
        userId,
        coachName,
        dosageId: dosage?.id,
        supplementName: dosage?.name || record.name,
      }).catch((err) => {
        console.error("Supplement dosage notification failed:", err?.message || err);
      });
    }
    dosages.push(dosage);
  }

  return res.status(200).json({
    status: true,
    message: "Nutrition dosages pushed to the app",
    dosages,
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
