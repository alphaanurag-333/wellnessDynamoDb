const ROW_SEP = "\u001f";

function measurementRowSig(row) {
  if (!row) return "";
  return [
    row.id || row._id,
    row.updatedAt,
    row.recordedAt,
    row.weightKg,
    row.reviewStatus,
    row.clientReviewStatus,
    row.chestCm,
    row.waistCm,
    row.hipCm,
  ].join(":");
}

function photoRowSig(row) {
  if (!row) return "";
  return [
    row.id || row._id,
    row.photoId,
    row.angle,
    row.updatedAt,
    row.recordedAt,
    row.reviewStatus,
    row.clientReviewStatus,
  ].join(":");
}

/** Client / app submissions only — excludes coach-only fields (target weight, in-app toggles). */
export function bodyAnalyticsClientPollSignature(data) {
  if (!data) return "";
  const measurements = (data.measurements || []).map(measurementRowSig).join("|");
  const photos = (data.photos || []).map(photoRowSig).join("|");
  return [
    JSON.stringify(data.paidOnboardingStepStatus || {}),
    measurements,
    photos,
    JSON.stringify(data.metabolicMetrics || []),
  ].join(ROW_SEP);
}

export function bodyAnalyticsPollSignature(data) {
  if (!data) return "";
  return [
    bodyAnalyticsClientPollSignature(data),
    String(data.targetWeightKg ?? ""),
    String(data.bodyMeasurementEnabled ?? ""),
    String(data.progressPhotosInAppEnabled ?? ""),
  ].join(ROW_SEP);
}

export function medicalConditionsPollSignature(payload) {
  if (!payload) return "";
  const record = payload.medicalCondition;
  if (!record) {
    return [
      "empty",
      String(payload.medicalConditionsInAppEnabled ?? ""),
      JSON.stringify(payload.paidOnboardingStepStatus || {}),
    ].join(ROW_SEP);
  }
  return [
    record.updatedAt || record.createdAt || "",
    String(payload.medicalConditionsInAppEnabled ?? ""),
    JSON.stringify(record.answers || record),
    JSON.stringify(payload.paidOnboardingStepStatus || {}),
  ].join(ROW_SEP);
}

export function bmsTrackingPollSignature(tab, data, range) {
  const from = range?.from ? String(range.from) : "";
  const to = range?.to ? String(range.to) : "";
  const history = (data?.history || []).map((row) => JSON.stringify(row)).join("|");
  return [
    tab,
    from,
    to,
    history,
    JSON.stringify(data?.settings || null),
    JSON.stringify(data?.today || null),
  ].join(ROW_SEP);
}

function mealLogRowSig(log) {
  if (!log) return "";
  return [
    log.id || log._id,
    log.date,
    log.updatedAt,
    log.createdAt,
    log.entryTime,
    log.status,
    log.aiStatus,
    log.loggedByRole,
    log.trackingMode,
    log.proteinGm,
    log.carbsGm,
    log.fatsGm,
    log.caloriesKcal,
    log.description,
    JSON.stringify(log.items || []),
    log.photoUrl ? "1" : "0",
  ].join(":");
}

/** Client meal logs for a single day — used to detect new app submissions in admin Food tracking. */
export function mealTrackingPollSignature(dateKey, data) {
  const logs = (data?.logs || [])
    .filter((log) => !log.date || log.date === dateKey)
    .map(mealLogRowSig)
    .join("|");
  return [
    String(dateKey || ""),
    String(data?.dailyMealGoal ?? ""),
    String(data?.mealTrackingMode ?? ""),
    logs,
  ].join(ROW_SEP);
}

export function waterTrackingPollSignature(range, data) {
  const from = range?.from ? String(range.from) : "";
  const to = range?.to ? String(range.to) : "";
  const history = (data?.history || []).map((row) => JSON.stringify(row)).join("|");
  return [from, to, history, JSON.stringify(data?.settings || null)].join(ROW_SEP);
}

/** Tracks TDEE/BMR + weight/activity so Food macro protein goal stays in sync with At a Glance. */
export function foodMetabolicPollSignature(bodyAnalyticsOrMetrics) {
  if (Array.isArray(bodyAnalyticsOrMetrics)) {
    return JSON.stringify(bodyAnalyticsOrMetrics);
  }
  const measurements = (bodyAnalyticsOrMetrics?.measurements || []).map((row) =>
    [row?.id || row?._id, row?.recordedAt, row?.updatedAt, row?.weightKg, row?.activityLevel].join(":"),
  );
  return JSON.stringify({
    metabolic: bodyAnalyticsOrMetrics?.metabolicMetrics || [],
    measurements,
  });
}

function healthProgressLogRowsSig(rows) {
  return (rows || [])
    .map((row) => [
      row.id || row._id,
      row.updatedAt,
      row.createdAt,
      row.recordedAt,
      row.reviewStatus,
      row.weightPicReviewStatus,
      row.glucosePicReviewStatus,
      row.bpPicReviewStatus,
      row.picReviewStatus,
      row.weightKg,
      row.glucoseMgDl,
      row.systolic,
      row.diastolic,
      row.picKey,
      row.weightPicKey,
      row.glucosePicKey,
      row.bpPicKey,
    ].join(":"))
    .join("|");
}

export function healthProgressLogsPollSignature(logs, hba1cReadings) {
  const bucket = logs || {};
  return [
    healthProgressLogRowsSig(bucket.weight),
    healthProgressLogRowsSig(bucket.glucose),
    healthProgressLogRowsSig(bucket.bp),
    healthProgressLogRowsSig(bucket.menstrual),
    healthProgressLogRowsSig(bucket.condition),
    JSON.stringify(hba1cReadings || []),
  ].join(ROW_SEP);
}

export function atAGlancePollSignature(payload) {
  if (!payload) return "";
  return JSON.stringify({
    glance: payload.glance || null,
    paidOnboardingStepStatus: payload.paidOnboardingStepStatus || {},
    paidOnboardingCompleted: Boolean(payload.paidOnboardingCompleted),
    completedStepsCount: payload.completedStepsCount,
    bodyAnalyticsClientDataReady: Boolean(payload.bodyAnalyticsClientDataReady),
  });
}

export function userRemindersPollSignature(rows) {
  return (rows || [])
    .map((row) => [
      row.id,
      row.updatedAt,
      row.createdAt,
      row.name,
      row.time,
      JSON.stringify(row.days || []),
      row.isActive === false ? "0" : "1",
    ].join(":"))
    .join("|");
}

export function coachInsightPollSignature(insight) {
  if (!insight) return "empty";
  return [
    insight.updatedAt,
    insight.visibleUntil,
    insight.durationHours,
    insight.isVisible === false ? "0" : "1",
    String(insight.message || "").length,
  ].join(ROW_SEP);
}

export function healthProgressSettingsPollSignature(result) {
  if (!result) return "";
  return JSON.stringify({
    settings: result.settings,
    clientUpload: result.clientUpload,
    isFemale: result.isFemale,
  });
}

export function bmsLibraryPollSignature(kind, items, reflectionAudioId) {
  const rows = (items || [])
    .map((item) => `${item.id}:${item.inApp ? "1" : "0"}:${item.assignmentId || ""}:${item.forDailyReflection ? "1" : "0"}`)
    .sort()
    .join("|");
  return `${kind}${ROW_SEP}${rows}${ROW_SEP}${reflectionAudioId || ""}`;
}

/** Profile row fingerprint for Personal details socket sync (mapApiUserToRow shape). */
export function personalProfileRemoteSignature(row) {
  if (!row) return "";
  return [
    row.updatedAt || "",
    row.name || "",
    row.email || "",
    row.dobIso || "",
    row.gender || "",
    row.phone || "",
    row.whatsapp || "",
    row.addressLine1 || "",
    row.addressLine2 || "",
    row.pincode || "",
    row.stateRaw || "",
    row.country || "",
    row.city || "",
    row.dietaryPreference || "",
    row.healthConcernId || "",
    row.goal || "",
    JSON.stringify(row.wellnessJourneyForRaw || []),
    JSON.stringify(row.paidOnboardingStepStatus || {}),
    row.termsIp || "",
    row.termsAcceptedBool ? "1" : "0",
    row.referredByCode || "",
    row.referralCode || "",
    row.tier || "",
    row.coach || "",
    row.awc || "",
    row.status || "",
    row.profileImage || "",
    String(row.programLabel || ""),
    row.programPurchased ? "1" : "0",
    String(row.clientCategory || ""),
  ].join(ROW_SEP);
}
