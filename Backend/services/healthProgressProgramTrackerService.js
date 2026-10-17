const { updateUser } = require("../models/userModel");
const {
  listUserProgramsByUserId,
  normalizeStatus,
} = require("../models/userProgramModel");
const {
  HEALTH_PROGRESS_FEATURE_KEYS,
  normalizeHealthProgressFeatures,
  applyPurchasedProgramTrackers,
} = require("../utils/healthProgressHelpers");

async function purchasedProgramLabels(userId) {
  if (!userId) return [];
  const result = await listUserProgramsByUserId(userId, { page: 1, limit: 50 });
  const labels = [];
  for (const row of result.items || []) {
    if (normalizeStatus(row.status) !== "purchased") continue;
    if (row.title) labels.push(row.title);
    if (row.catalogProgramId) labels.push(row.catalogProgramId);
  }
  return labels;
}

function featuresChanged(before, after) {
  return HEALTH_PROGRESS_FEATURE_KEYS.some(
    (key) => Boolean(before[key]) !== Boolean(after[key])
  );
}

async function ensurePurchasedProgramTrackers(user) {
  if (!user?.id) return user;
  const labels = await purchasedProgramLabels(user.id);
  const stored = normalizeHealthProgressFeatures(user.healthProgressFeatures);
  const next = applyPurchasedProgramTrackers(stored, labels, user);
  if (!featuresChanged(stored, next)) return user;
  return updateUser(user.id, { healthProgressFeatures: next });
}

async function withPurchasedProgramTrackers(user, features) {
  const labels = await purchasedProgramLabels(user?.id);
  return applyPurchasedProgramTrackers(features, labels, user);
}

module.exports = {
  purchasedProgramLabels,
  ensurePurchasedProgramTrackers,
  withPurchasedProgramTrackers,
};
