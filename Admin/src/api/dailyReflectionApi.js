import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function tokenOrStored(token) {
  return token || getAccountToken();
}

function settingsBase(userId) {
  return `/account/heal-users/${encodeURIComponent(userId)}/daily-reflection-settings`;
}

function reflectionBase(userId) {
  return `/account/heal-users/${encodeURIComponent(userId)}/daily-reflection`;
}

function mapActivity(row) {
  if (!row) return null;
  const key = String(row.key || "").trim();
  if (!key) return null;
  return {
    key,
    name: String(row.name || key).trim(),
    section: String(row.section || "Activities").trim(),
    unit: String(row.unit || "times"),
    defaultGoal: Number.isFinite(Number(row.defaultGoal)) ? Number(row.defaultGoal) : 0,
    enabled: row.enabled === true,
    goal: Number.isFinite(Number(row.goal)) ? Number(row.goal) : 0,
    todayValue: Number.isFinite(Number(row.todayValue)) ? Number(row.todayValue) : 0,
  };
}

function mapTrackingMetric(row) {
  return {
    current: Number(row?.current || 0),
    goal: Number(row?.goal || 0),
    percent: row?.percent == null ? null : Number(row.percent),
  };
}

function mapQuestion(row) {
  if (!row) return null;
  const id = String(row.id || "").trim();
  if (!id) return null;
  return {
    id,
    name: String(row.name || row.text || "").trim(),
    points: Number.isFinite(Number(row.points)) ? Number(row.points) : 0,
    fixed: Boolean(row.fixed),
    selected: row.selected === true || row.fixed === true,
  };
}

function mapSection(row) {
  if (!row) return null;
  const id = String(row.id || "").trim();
  if (!id) return null;
  return {
    id,
    name: String(row.name || row.title || "").trim(),
    weight: Number.isFinite(Number(row.weight)) ? Number(row.weight) : 0,
    fixed: Boolean(row.fixed),
    questions: (Array.isArray(row.questions) ? row.questions : []).map(mapQuestion).filter(Boolean),
  };
}

export function mapDailyReflectionSettings(data) {
  const todayScore = data?.todayScore && typeof data.todayScore === "object"
    ? {
        date: String(data.todayScore.date || ""),
        score: Number(data.todayScore.score || 0),
        maxScore: Number(data.todayScore.maxScore || 100),
      }
    : null;
  return {
    date: String(data?.date || ""),
    sections: (Array.isArray(data?.sections) ? data.sections : []).map(mapSection).filter(Boolean),
    selectedQuestionIds: Array.isArray(data?.selectedQuestionIds)
      ? data.selectedQuestionIds.map((id) => String(id))
      : [],
    activities: (Array.isArray(data?.activities) ? data.activities : []).map(mapActivity).filter(Boolean),
    tracking: {
      steps: mapTrackingMetric(data?.tracking?.steps),
      water: mapTrackingMetric(data?.tracking?.water),
      nutrition: mapTrackingMetric(data?.tracking?.nutrition),
      meal: mapTrackingMetric(data?.tracking?.meal),
    },
    bedtime: String(data?.bedtime || "22:30"),
    todayScore,
    todayLog: data?.todayLog || null,
    scoring: data?.scoring || null,
    updatedAt: data?.updatedAt || null,
  };
}

export async function fetchUserDailyReflectionSettings(userId) {
  try {
    const { data } = await api.get(settingsBase(userId), {
      headers: authHeader(tokenOrStored()),
    });
    return mapDailyReflectionSettings(data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveUserDailyReflectionSettings(userId, { selectedQuestionIds, activities, bedtime } = {}) {
  const payload = {};
  if (selectedQuestionIds !== undefined) payload.selectedQuestionIds = selectedQuestionIds;
  if (activities !== undefined) payload.activities = activities;
  if (bedtime !== undefined) payload.bedtime = bedtime;
  try {
    const { data } = await api.patch(settingsBase(userId), payload, {
      headers: authHeader(tokenOrStored()),
    });
    return mapDailyReflectionSettings(data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function submitUserDailyReflectionScore(userId, { activityValues, gratitudeYes, date } = {}) {
  try {
    const { data } = await api.post(reflectionBase(userId), {
      activityValues,
      gratitudeYes,
      date,
    }, {
      headers: authHeader(tokenOrStored()),
    });
    return mapDailyReflectionSettings(data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function pushUserDailyReflectionBedtime(userId) {
  try {
    const { data } = await api.post(`${reflectionBase(userId)}/bedtime-push`, {}, {
      headers: authHeader(tokenOrStored()),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserDailyReflectionHistory(userId, month) {
  const q = new URLSearchParams();
  if (month) q.set("month", month);
  try {
    const { data } = await api.get(`${reflectionBase(userId)}/history${q.toString() ? `?${q}` : ""}`, {
      headers: authHeader(tokenOrStored()),
    });
    return {
      month: data?.month || "",
      history: Array.isArray(data?.history) ? data.history : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
