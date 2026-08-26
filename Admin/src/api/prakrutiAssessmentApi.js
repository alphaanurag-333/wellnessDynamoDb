import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

const QUESTIONS_BASE = "/admin/prakruti-questions";
const AVOID_BASE = "/admin/prakruti-things-to-avoid";
const REC_BASE = "/admin/prakruti-recommendations";

function tokenOrStored(token) {
  return token || getAccountToken();
}

function mapQuestion(row) {
  if (!row) return null;
  return {
    id: row.id || row._id,
    category: String(row.category || "").trim(),
    question: String(row.question || "").trim(),
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    status: row.status === "inactive" ? "inactive" : "active",
    shown: row.status !== "inactive",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapThing(row) {
  if (!row) return null;
  return {
    id: row.id || row._id,
    title: String(row.title || "").trim(),
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    status: row.status === "inactive" ? "inactive" : "active",
    shown: row.status !== "inactive",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRecommendation(row) {
  if (!row) return null;
  return {
    id: row.id || row._id,
    prakrutiType: String(row.prakrutiType || "").trim().toLowerCase(),
    title: String(row.title || "").trim(),
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    status: row.status === "inactive" ? "inactive" : "active",
    shown: row.status !== "inactive",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const PRAKRUTI_CATEGORIES = [
  { id: "Vata", value: "Vata", label: "Vāta" },
  { id: "Pitta", value: "Pitta", label: "Pitta" },
  { id: "Kapha", value: "Kapha", label: "Kapha" },
];

export const PRAKRUTI_TYPE_OPTIONS = [
  { id: "vata", value: "vata", label: "Vata" },
  { id: "pitta", value: "pitta", label: "Pitta" },
  { id: "kapha", value: "kapha", label: "Kapha" },
  { id: "vata_pitta", value: "vata_pitta", label: "Vata-Pitta" },
  { id: "pitta_kapha", value: "pitta_kapha", label: "Pitta-Kapha" },
  { id: "kapha_vata", value: "kapha_vata", label: "Kapha-Vata" },
  { id: "sama_prakriti", value: "sama_prakriti", label: "Sama Prakriti" },
];

export async function adminListPrakrutiQuestions(token, { page = 1, limit = 200, status, search, category } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (category && String(category).trim()) q.set("category", String(category).trim());
  try {
    const { data } = await api.get(`${QUESTIONS_BASE}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const questions = (Array.isArray(data.questions) ? data.questions : []).map(mapQuestion).filter(Boolean);
    return {
      questions,
      pagination: data.pagination ?? { page, limit, total: questions.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreatePrakrutiQuestion(token, fields) {
  try {
    const { data } = await api.post(
      QUESTIONS_BASE,
      {
        category: String(fields.category ?? "").trim(),
        question: String(fields.question ?? "").trim(),
        status: fields.status || (fields.shown === false ? "inactive" : "active"),
        ...(fields.sortOrder !== undefined ? { sortOrder: fields.sortOrder } : {}),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapQuestion(data.question);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdatePrakrutiQuestion(token, id, fields) {
  const payload = {};
  if (fields.category !== undefined) payload.category = String(fields.category).trim();
  if (fields.question !== undefined) payload.question = String(fields.question).trim();
  if (fields.sortOrder !== undefined) payload.sortOrder = fields.sortOrder;
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.shown !== undefined) payload.status = fields.shown ? "active" : "inactive";

  try {
    const { data } = await api.patch(`${QUESTIONS_BASE}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapQuestion(data.question);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeletePrakrutiQuestion(token, id) {
  try {
    await api.delete(`${QUESTIONS_BASE}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListPrakrutiThingsToAvoid(token, { page = 1, limit = 200, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${AVOID_BASE}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const thingsToAvoid = (Array.isArray(data.thingsToAvoid) ? data.thingsToAvoid : [])
      .map(mapThing)
      .filter(Boolean);
    return {
      thingsToAvoid,
      pagination: data.pagination ?? { page, limit, total: thingsToAvoid.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreatePrakrutiThingToAvoid(token, fields) {
  try {
    const { data } = await api.post(
      AVOID_BASE,
      {
        title: String(fields.title ?? "").trim(),
        status: fields.status || (fields.shown === false ? "inactive" : "active"),
        ...(fields.sortOrder !== undefined ? { sortOrder: fields.sortOrder } : {}),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapThing(data.thingToAvoid);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdatePrakrutiThingToAvoid(token, id, fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.sortOrder !== undefined) payload.sortOrder = fields.sortOrder;
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.shown !== undefined) payload.status = fields.shown ? "active" : "inactive";

  try {
    const { data } = await api.patch(`${AVOID_BASE}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapThing(data.thingToAvoid);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeletePrakrutiThingToAvoid(token, id) {
  try {
    await api.delete(`${AVOID_BASE}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListPrakrutiRecommendations(
  token,
  { page = 1, limit = 200, status, search, prakrutiType } = {},
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (prakrutiType) q.set("prakrutiType", prakrutiType);
  try {
    const { data } = await api.get(`${REC_BASE}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const recommendations = (Array.isArray(data.recommendations) ? data.recommendations : [])
      .map(mapRecommendation)
      .filter(Boolean);
    return {
      recommendations,
      pagination: data.pagination ?? { page, limit, total: recommendations.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreatePrakrutiRecommendation(token, fields) {
  try {
    const { data } = await api.post(
      REC_BASE,
      {
        prakrutiType: String(fields.prakrutiType ?? "").trim(),
        title: String(fields.title ?? "").trim(),
        status: fields.status || (fields.shown === false ? "inactive" : "active"),
        ...(fields.sortOrder !== undefined ? { sortOrder: fields.sortOrder } : {}),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapRecommendation(data.recommendation);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdatePrakrutiRecommendation(token, id, fields) {
  const payload = {};
  if (fields.prakrutiType !== undefined) payload.prakrutiType = String(fields.prakrutiType).trim();
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.sortOrder !== undefined) payload.sortOrder = fields.sortOrder;
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.shown !== undefined) payload.status = fields.shown ? "active" : "inactive";

  try {
    const { data } = await api.patch(`${REC_BASE}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapRecommendation(data.recommendation);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeletePrakrutiRecommendation(token, id) {
  try {
    await api.delete(`${REC_BASE}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
