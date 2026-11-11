const { updateUser, normalizeWellnessJourneyFor } = require("../models/userModel");
const { getHealthConcernById } = require("../models/healthConcernModel");
const {
  listUserProgramsByUserId,
  normalizeStatus,
} = require("../models/userProgramModel");
const {
  HEALTH_PROGRESS_FEATURE_KEYS,
  normalizeHealthProgressFeatures,
  applyPurchasedProgramTrackers,
  isGeneralWellbeingConcernLabel,
  isBroadWellnessProgramLabel,
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

function concernToken(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    return String(value.title || value.name || value.id || value._id || "").trim();
  }
  return String(value).trim();
}

async function labelForConcernToken(token, otherTitle) {
  const raw = String(token || "").trim();
  if (!raw) return "";
  try {
    const concern = await getHealthConcernById(raw);
    const title = String(concern?.title || "").trim();
    if (title) {
      if (title.toLowerCase() === "other" && otherTitle) return otherTitle;
      return title;
    }
  } catch {
    /* Keep the stored title or slug when it is not a concern id. */
  }
  return raw;
}

/** Primary concern plus wellness-journey choices the client made before purchase. */
async function clientSelectionLabels(user) {
  const otherTitle = String(user?.primaryHealthConcernOther || "").trim();
  const labels = [];
  const concern = await labelForConcernToken(concernToken(user?.primaryHealthConcern), otherTitle);
  if (concern) labels.push(concern);
  else if (otherTitle) labels.push(otherTitle);

  const journey = normalizeWellnessJourneyFor(user?.wellnessJourneyFor) || [];
  for (const token of journey) {
    const label = await labelForConcernToken(token, otherTitle);
    if (label) labels.push(label);
  }
  return labels;
}

async function userHasGeneralWellbeingPrimary(user) {
  const otherTitle = String(user?.primaryHealthConcernOther || "").trim();
  const token = concernToken(user?.primaryHealthConcern);
  const concern = await labelForConcernToken(token, otherTitle);
  if (isGeneralWellbeingConcernLabel(concern)) return true;
  return isGeneralWellbeingConcernLabel(token);
}

function programLabelsForTrackers(programLabels) {
  return (programLabels || []).filter((label) => !isBroadWellnessProgramLabel(label));
}

async function trackerLabelsForUser(user) {
  const programLabels = user?.id ? await purchasedProgramLabels(user.id) : [];
  const purchased = programLabels.length > 0 || Boolean(user?.programPurchased);
  if (!purchased) return programLabelsForTrackers(programLabels);

  const diseaseProgramLabels = programLabelsForTrackers(programLabels);
  if (await userHasGeneralWellbeingPrimary(user)) {
    return diseaseProgramLabels;
  }

  const selections = await clientSelectionLabels(user);
  return [...diseaseProgramLabels, ...selections];
}

function reconcileHealthProgressFeatures(user, labels) {
  const stored = normalizeHealthProgressFeatures(user?.healthProgressFeatures);
  const next = applyPurchasedProgramTrackers({}, labels, user);
  next.conditionComparison = Boolean(stored.conditionComparison);
  return next;
}

async function ensurePurchasedProgramTrackers(user) {
  if (!user?.id) return user;
  const labels = await trackerLabelsForUser(user);
  const stored = normalizeHealthProgressFeatures(user.healthProgressFeatures);
  const next = reconcileHealthProgressFeatures(user, labels);
  if (!featuresChanged(stored, next)) return user;
  return updateUser(user.id, { healthProgressFeatures: next });
}

const PROFILE_SELECTION_SYNC_KEYS = new Set([
  "wellnessJourneyFor",
  "primaryHealthConcern",
  "primaryHealthConcernOther",
  "healthConcerns",
]);

function updatesAffectHealthProgressSelections(updates) {
  if (!updates || typeof updates !== "object") return false;
  return Object.keys(updates).some((key) => PROFILE_SELECTION_SYNC_KEYS.has(key));
}

async function syncHealthProgressAfterProfileSelections(user) {
  if (!user?.id) return user;
  return ensurePurchasedProgramTrackers(user);
}

async function withPurchasedProgramTrackers(user, features) {
  const labels = await trackerLabelsForUser(user);
  return applyPurchasedProgramTrackers(features, labels, user);
}

module.exports = {
  purchasedProgramLabels,
  reconcileHealthProgressFeatures,
  ensurePurchasedProgramTrackers,
  withPurchasedProgramTrackers,
  updatesAffectHealthProgressSelections,
  syncHealthProgressAfterProfileSelections,
};
