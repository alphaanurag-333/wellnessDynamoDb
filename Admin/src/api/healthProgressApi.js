import api, { normalizeApiError } from "../api.js";

const FEATURE_KEYS = [
  "weightPic",
  "glucose",
  "bloodPressure",
  "menstrualCycle",
  "conditionComparison",
];

function healUserPath(userId, suffix = "") {
  return `/account/heal-users/${encodeURIComponent(userId)}${suffix}`;
}

const CLIENT_UPLOAD_KEYS = ["weightPic", "glucose", "bloodPressure", "conditionComparison"];

function emptySettings() {
  return {
    weightPic: false,
    glucose: false,
    bloodPressure: false,
    menstrualCycle: false,
    conditionComparison: false,
  };
}

function emptyClientUpload() {
  const out = {};
  for (const key of CLIENT_UPLOAD_KEYS) out[key] = { open: false, source: null };
  return out;
}

function pickBooleans(source) {
  const out = emptySettings();
  if (!source || typeof source !== "object") return out;
  for (const key of FEATURE_KEYS) {
    if (source[key] !== undefined) out[key] = Boolean(source[key]);
  }
  return out;
}

function pickClientUpload(source) {
  const out = emptyClientUpload();
  if (!source || typeof source !== "object") return out;
  for (const key of CLIENT_UPLOAD_KEYS) {
    const row = source[key];
    const sourceName = row?.source === "saturday" || row?.source === "coach" ? row.source : null;
    out[key] = { open: Boolean(row?.open), source: sourceName };
  }
  return out;
}

export function mapHealthProgressSettings(data = {}) {
  const settings = pickBooleans(data.settings);
  return {
    settings,
    storedSettings: pickBooleans(data.storedSettings || data.settings),
    clientUpload: pickClientUpload(data.clientUpload),
    gender: String(data.gender || ""),
    isFemale: Boolean(data.isFemale),
  };
}

export async function fetchHealthProgressSettings(userId) {
  try {
    const { data } = await api.get(healUserPath(userId, "/health-progress-settings"));
    return mapHealthProgressSettings(data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function openHealthProgressClientUpload(userId, featureKey) {
  try {
    const { data } = await api.patch(healUserPath(userId, "/health-progress-settings"), {
      clientUpload: { [featureKey]: true },
    });
    return mapHealthProgressSettings(data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateHealthProgressSettings(userId, features = {}) {
  const payload = {};
  for (const key of FEATURE_KEYS) {
    if (features[key] !== undefined) payload[key] = Boolean(features[key]);
  }
  try {
    const { data } = await api.patch(healUserPath(userId, "/health-progress-settings"), {
      healthProgressFeatures: payload,
    });
    return mapHealthProgressSettings(data);
  } catch (error) {
    normalizeApiError(error);
  }
}

async function fetchLogs(userId, path) {
  try {
    const { data } = await api.get(`${healUserPath(userId, path)}?page=1&limit=100`);
    return Array.isArray(data?.logs) ? data.logs.filter(Boolean) : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchWeightLogs(userId) {
  return fetchLogs(userId, "/health-progress/weight");
}

export async function createCoachWeightLog(userId, payload = {}) {
  try {
    const { file, date, weight, unit, ...rest } = payload;
    if (file instanceof File) {
      const form = new FormData();
      if (date) form.append("date", date);
      if (weight != null) form.append("weight", String(weight));
      if (unit) form.append("unit", unit);
      Object.entries(rest).forEach(([key, value]) => {
        if (value != null) form.append(key, String(value));
      });
      form.append("weight_pic", file);
      const { data } = await api.post(healUserPath(userId, "/health-progress/weight"), form);
      return data?.log || null;
    }
    const { data } = await api.post(healUserPath(userId, "/health-progress/weight"), {
      date,
      weight,
      unit,
      ...rest,
    });
    return data?.log || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function reviewCoachWeightPhoto(userId, logId, { action, rejectionReason } = {}) {
  try {
    const { data } = await api.patch(
      `${healUserPath(userId, "/health-progress/weight")}/${encodeURIComponent(logId)}/photo-review`,
      { action, rejectionReason: rejectionReason || "" },
    );
    return data?.log || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteCoachWeightPhoto(userId, logId) {
  try {
    const { data } = await api.delete(
      `${healUserPath(userId, "/health-progress/weight")}/${encodeURIComponent(logId)}/photo`,
    );
    return data?.log || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchGlucoseLogs(userId) {
  return fetchLogs(userId, "/health-progress/glucose");
}

export async function fetchBloodPressureLogs(userId) {
  return fetchLogs(userId, "/health-progress/blood-pressure");
}

export async function fetchMenstrualCycleLogs(userId) {
  return fetchLogs(userId, "/health-progress/menstrual-cycle");
}

export async function fetchConditionLogs(userId) {
  return fetchLogs(userId, "/health-progress/condition-comparison");
}
