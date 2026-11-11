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
