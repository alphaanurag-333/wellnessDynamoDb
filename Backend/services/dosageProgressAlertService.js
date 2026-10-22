const { getUserById } = require("../models/userModel");
const {
  isDosagePublished,
  markDosageNearCompleteNotified,
} = require("../models/userSupplementDosageModel");

const NEAR_COMPLETE_PERCENT = 90;

function shouldAlertDosageNearComplete(dosage, progressPercent) {
  if (!dosage) return false;
  if (String(dosage.status || "").toLowerCase() === "stopped") return false;
  if (!isDosagePublished(dosage)) return false;
  if (dosage.nearCompleteNotifiedAt) return false;
  const pct = Number(progressPercent);
  return Number.isFinite(pct) && pct >= NEAR_COMPLETE_PERCENT;
}

async function maybeNotifyDosageNearComplete({ user, userId, dosage, progressPercent }) {
  if (!shouldAlertDosageNearComplete(dosage, progressPercent)) return null;

  const claimed = await markDosageNearCompleteNotified(dosage.id || dosage._id);
  if (!claimed) return null;

  const subject = user || (userId ? await getUserById(userId) : null);
  if (!subject) return null;

  const {
    dispatchDosageNearCompleteCoachNotificationAsync,
  } = require("./notificationDispatchService");

  dispatchDosageNearCompleteCoachNotificationAsync({
    user: subject,
    dosage,
    progressPercent: Math.min(100, Math.round(Number(progressPercent) || 0)),
  });
  return true;
}

function maybeNotifyDosageNearCompleteAsync(payload) {
  Promise.resolve(maybeNotifyDosageNearComplete(payload)).catch((err) => {
    console.error("[DosageNearComplete] notify failed:", err?.message || err);
  });
}

module.exports = {
  NEAR_COMPLETE_PERCENT,
  shouldAlertDosageNearComplete,
  maybeNotifyDosageNearComplete,
  maybeNotifyDosageNearCompleteAsync,
};
