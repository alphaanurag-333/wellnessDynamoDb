import { parseWellnessJourneyTokens } from "../api/usersApi.js";

const AUTO_FEATURE_KEYS = ["weightPic", "glucose", "bloodPressure", "menstrualCycle"];

function programLookupText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mirrors Backend/utils/healthProgressHelpers.isGeneralWellbeingConcernLabel */
export function isGeneralWellbeingConcernLabel(label) {
  const text = programLookupText(label);
  if (!text) return false;
  return (
    /\boverall wellbeing\b/.test(text) ||
    /\beveryday wellness\b/.test(text) ||
    text === "overall wellbeing" ||
    text === "everyday wellness"
  );
}

/** Mirrors Backend/utils/healthProgressHelpers.isBroadWellnessProgramLabel */
function isBroadWellnessProgramLabel(label) {
  const text = programLookupText(label);
  if (!text) return false;
  if (isGeneralWellbeingConcernLabel(label)) return true;
  if (/\bseek to heal\b/.test(text)) return true;
  if (text === "general" || text === "seek to heal" || text === "seek_to_heal") return true;
  return false;
}

/** Mirrors Backend/utils/healthProgressHelpers.trackerFeatureKeysForProgramLabel */
export function trackerFeatureKeysForProgramLabel(label) {
  const text = programLookupText(label);
  if (!text) return [];
  if (isGeneralWellbeingConcernLabel(label) || isBroadWellnessProgramLabel(label)) {
    return [];
  }

  const keys = [];
  if (/\b(fat loss|weight loss|fatloss)\b/.test(text)) keys.push("weightPic");
  if (/\bdiabetes\b/.test(text)) keys.push("glucose");
  if (/\b(pcod|pcos|pmos)\b/.test(text)) keys.push("menstrualCycle");
  if (/\b(hypertension|blood pressure|heart)\b/.test(text)) keys.push("bloodPressure");
  return keys;
}

function isFemaleUser(gender) {
  const g = String(gender || "").toLowerCase().trim();
  return g === "female" || g === "girl" || g === "f";
}

function journeyTokenLabel(token) {
  if (token == null) return "";
  if (typeof token === "object") {
    return String(token.title || token.name || token.label || token.id || "").trim();
  }
  return String(token).trim();
}

function clientHasPurchasedProgram(user) {
  return Boolean(user?.programPurchased) || Number(user?.programs) > 0;
}

function selectionLabelsFromProfileUser(user) {
  const goal = String(user?.goal || "").trim();
  if (isGeneralWellbeingConcernLabel(goal)) {
    return [];
  }

  const labels = [];
  if (goal) labels.push(goal);

  const raw = user?.wellnessJourneyForRaw?.length
    ? user.wellnessJourneyForRaw
    : parseWellnessJourneyTokens(user?.wellnessJourneyFor);
  for (const token of raw || []) {
    const label = journeyTokenLabel(token);
    if (label) labels.push(label);
  }

  const programTitle = String(user?.assignedProgramTitle || "").trim();
  if (programTitle && !isBroadWellnessProgramLabel(programTitle)) labels.push(programTitle);
  const catalogId = String(user?.assignedCatalogProgramId || "").trim();
  if (catalogId && !isBroadWellnessProgramLabel(catalogId)) labels.push(catalogId);

  return labels;
}

function applyLabelsToFeatures(labels, gender) {
  const next = {
    weightPic: false,
    glucose: false,
    bloodPressure: false,
    menstrualCycle: false,
    conditionComparison: false,
  };
  const female = isFemaleUser(gender);
  const trackerLabels = (labels || []).filter((label) => !isBroadWellnessProgramLabel(label));
  for (const label of trackerLabels) {
    for (const key of trackerFeatureKeysForProgramLabel(label)) {
      if (key === "menstrualCycle" && !female) continue;
      next[key] = true;
    }
  }
  if (!female) next.menstrualCycle = false;
  return next;
}

function resolveStoredHealthProgressFeatures(user) {
  const stored = user?.healthProgressFeatures;
  if (!stored || typeof stored !== "object") return null;
  const female = isFemaleUser(user?.gender);
  return {
    weightPic: Boolean(stored.weightPic),
    glucose: Boolean(stored.glucose),
    bloodPressure: Boolean(stored.bloodPressure),
    menstrualCycle: Boolean(stored.menstrualCycle) && female,
    conditionComparison: Boolean(stored.conditionComparison),
  };
}

function hasAnyEnabledFeature(settings) {
  if (!settings) return false;
  return [...AUTO_FEATURE_KEYS, "conditionComparison"].some((key) => Boolean(settings[key]));
}

/** Whether the client profile sidebar should show Health Progress (matches backend tracker rules). */
export function clientHasHealthProgressSection(user) {
  if (!user) return false;

  const storedResolved = resolveStoredHealthProgressFeatures(user);
  if (storedResolved) return hasAnyEnabledFeature(storedResolved);

  if (!clientHasPurchasedProgram(user)) return false;

  if (isGeneralWellbeingConcernLabel(String(user?.goal || "").trim())) {
    return false;
  }

  const labels = selectionLabelsFromProfileUser(user);
  const derived = applyLabelsToFeatures(labels, user?.gender);
  return hasAnyEnabledFeature(derived);
}
