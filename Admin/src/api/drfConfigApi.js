import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function drfConfigBase() {
  return "/admin/drf-config";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

function mapQuestion(row) {
  if (!row) return null;
  return {
    id: row.id,
    sectionId: row.sectionId,
    name: row.name || "",
    points: Number.isFinite(Number(row.points)) ? Number(row.points) : 0,
    enabled: row.enabled !== false,
    fixed: Boolean(row.fixed),
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
  };
}

function mapSection(row) {
  if (!row) return null;
  const mapped = {
    id: row.id,
    name: row.name || "",
    weight: Number.isFinite(Number(row.weight)) ? Number(row.weight) : 0,
    live: row.live !== false,
    fixed: Boolean(row.fixed),
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
  };
  if (Array.isArray(row.questions)) {
    mapped.questions = row.questions.map(mapQuestion).filter(Boolean);
  }
  return mapped;
}

export async function adminGetDrfConfig(token) {
  try {
    const { data } = await api.get(drfConfigBase(), {
      headers: authHeader(tokenOrStored(token)),
    });
    return {
      sections: (Array.isArray(data.sections) ? data.sections : []).map(mapSection).filter(Boolean),
      scoring: data.scoring || null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateDrfSection(token, fields) {
  try {
    const { data } = await api.post(
      `${drfConfigBase()}/sections`,
      {
        name: String(fields.name ?? "").trim(),
        weight: Number(fields.weight) || 0,
        live: fields.live !== false,
        fixed: Boolean(fields.fixed),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapSection({ ...data.section, questions: data.section?.questions || [] });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateDrfSection(token, id, fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.weight !== undefined) payload.weight = Number(fields.weight);
  if (fields.live !== undefined) payload.live = Boolean(fields.live);
  if (fields.fixed !== undefined) payload.fixed = Boolean(fields.fixed);
  try {
    const { data } = await api.patch(
      `${drfConfigBase()}/sections/${encodeURIComponent(id)}`,
      payload,
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapSection(data.section);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteDrfSection(token, id) {
  try {
    await api.delete(`${drfConfigBase()}/sections/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateDrfQuestion(token, sectionId, fields) {
  try {
    const { data } = await api.post(
      `${drfConfigBase()}/sections/${encodeURIComponent(sectionId)}/questions`,
      {
        name: String(fields.name ?? "").trim(),
        points: fields.points !== undefined ? Number(fields.points) : undefined,
        enabled: fields.enabled !== false,
        fixed: Boolean(fields.fixed),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapQuestion(data.question);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateDrfQuestion(token, sectionId, id, fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.points !== undefined) payload.points = Number(fields.points);
  if (fields.enabled !== undefined) payload.enabled = Boolean(fields.enabled);
  if (fields.fixed !== undefined) payload.fixed = Boolean(fields.fixed);
  try {
    const { data } = await api.patch(
      `${drfConfigBase()}/sections/${encodeURIComponent(sectionId)}/questions/${encodeURIComponent(id)}`,
      payload,
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapQuestion(data.question);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteDrfQuestion(token, sectionId, id) {
  try {
    await api.delete(
      `${drfConfigBase()}/sections/${encodeURIComponent(sectionId)}/questions/${encodeURIComponent(id)}`,
      { headers: authHeader(tokenOrStored(token)) },
    );
  } catch (error) {
    normalizeApiError(error);
  }
}
