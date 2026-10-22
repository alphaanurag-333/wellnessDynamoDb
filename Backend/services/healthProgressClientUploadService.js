const AppError = require("../utils/AppError");
const { updateUser, getUserById } = require("../models/userModel");
const {
  HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS,
  resolveHealthProgressClientUpload,
  closeHealthProgressClientUpload,
  openHealthProgressClientUpload,
} = require("../utils/healthProgressHelpers");

const CLIENT_UPLOAD_LABELS = {
  weightPic: "Fat Loss",
  glucose: "Glucose Panel",
  bloodPressure: "BP tracking",
  conditionComparison: "condition tracking",
};

function clientUploadWindows(stored, now = new Date()) {
  return resolveHealthProgressClientUpload(stored, now);
}

async function syncClientUploadWindow(user, now = new Date()) {
  if (!user?.id) return user;
  const resolved = resolveHealthProgressClientUpload(user.healthProgressClientUpload, now);
  if (!resolved.changed) return { ...user, healthProgressClientUpload: resolved.stored };
  const updated = await updateUser(user.id, { healthProgressClientUpload: resolved.stored });
  return updated || user;
}

function assertClientUploadOpen(user, featureKey, now = new Date()) {
  if (!HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS.includes(featureKey)) return;
  const resolved = resolveHealthProgressClientUpload(user?.healthProgressClientUpload, now);
  if (resolved.windows[featureKey]?.open) return;
  const label = CLIENT_UPLOAD_LABELS[featureKey] || "This section";
  throw new AppError(
    `${label} updates are closed. A wellness coach can open them again.`,
    403,
  );
}

async function closeClientUploadAfterSave(userId, featureKey, _user, now = new Date()) {
  if (!userId || !HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS.includes(featureKey)) return null;
  const current = await getUserById(userId);
  const next = closeHealthProgressClientUpload(current?.healthProgressClientUpload, featureKey, now);
  return updateUser(userId, { healthProgressClientUpload: next });
}

function assertCoachCanOpenClientUpload(req) {
  const role = req.auth?.role;
  if (role === "admin" || role === "wellness_coach" || role === "assistant_wellness_coach") return;
  throw new AppError("Only an admin, wellness coach, or assistant wellness coach can open client updates", 403);
}

async function openClientUploadForCoach(user, featureKey) {
  if (!HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS.includes(featureKey)) {
    throw new AppError("This section cannot be opened for client updates", 400);
  }
  const next = openHealthProgressClientUpload(user?.healthProgressClientUpload, featureKey);
  return updateUser(user.id, { healthProgressClientUpload: next });
}

async function closeClientUploadForCoach(user, featureKey, now = new Date()) {
  if (!HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS.includes(featureKey)) {
    throw new AppError("This section cannot be closed for client updates", 400);
  }
  const next = closeHealthProgressClientUpload(user?.healthProgressClientUpload, featureKey, now);
  return updateUser(user.id, { healthProgressClientUpload: next });
}

module.exports = {
  CLIENT_UPLOAD_LABELS,
  clientUploadWindows,
  syncClientUploadWindow,
  assertClientUploadOpen,
  closeClientUploadAfterSave,
  assertCoachCanOpenClientUpload,
  openClientUploadForCoach,
  closeClientUploadForCoach,
};
