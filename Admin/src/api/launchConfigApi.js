import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function launchConfigBase() {
  return "/admin/launch-config";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

function mapRating(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || "",
    badge: row.badge || String(row.name || "").toUpperCase(),
    tone: row.tone || "default",
    points: Number.isFinite(Number(row.points)) ? Number(row.points) : 0,
    description: row.description || "",
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    status: row.status === "inactive" ? "inactive" : "active",
  };
}

function mapQuestion(row) {
  if (!row) return null;
  return {
    id: row.id,
    domainId: row.domainId,
    name: row.name || "",
    points: Number.isFinite(Number(row.points)) ? Number(row.points) : 0,
    enabled: row.enabled !== false,
    fixed: Boolean(row.fixed),
    hasInfo: row.hasInfo !== false,
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
  };
}

function mapDomain(row) {
  if (!row) return null;
  const minRequirementRaw = Number(row.minRequirement);
  const mapped = {
    id: row.id,
    name: row.name || "",
    weight: Number.isFinite(Number(row.weight)) ? Number(row.weight) : 0,
    minRequirement: Number.isFinite(minRequirementRaw) ? minRequirementRaw : 50,
    live: row.live !== false,
    fixed: Boolean(row.fixed),
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
  };
  if (Array.isArray(row.questions)) {
    mapped.questions = row.questions.map(mapQuestion).filter(Boolean);
  }
  return mapped;
}

export async function adminGetLaunchConfig(token) {
  try {
    const { data } = await api.get(launchConfigBase(), {
      headers: authHeader(tokenOrStored(token)),
    });
    return {
      ratings: (Array.isArray(data.ratings) ? data.ratings : []).map(mapRating).filter(Boolean),
      domains: (Array.isArray(data.domains) ? data.domains : []).map(mapDomain).filter(Boolean),
      scoring: data.scoring || null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminScoreLaunchConfig(token, answers) {
  try {
    const { data } = await api.post(
      `${launchConfigBase()}/score`,
      { answers },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateLaunchRating(token, fields) {
  try {
    const { data } = await api.post(
      `${launchConfigBase()}/ratings`,
      {
        name: String(fields.name ?? "").trim(),
        points: Number(fields.points),
        description: String(fields.description ?? "").trim(),
        badge: fields.badge,
        tone: fields.tone || "default",
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapRating(data.rating);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateLaunchRating(token, id, fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.badge !== undefined) payload.badge = String(fields.badge).trim();
  if (fields.description !== undefined) payload.description = String(fields.description).trim();
  if (fields.points !== undefined) payload.points = Number(fields.points);
  if (fields.tone !== undefined) payload.tone = fields.tone;
  try {
    const { data } = await api.patch(
      `${launchConfigBase()}/ratings/${encodeURIComponent(id)}`,
      payload,
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapRating(data.rating);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteLaunchRating(token, id) {
  try {
    await api.delete(`${launchConfigBase()}/ratings/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateLaunchDomain(token, fields) {
  try {
    const { data } = await api.post(
      `${launchConfigBase()}/domains`,
      {
        name: String(fields.name ?? "").trim(),
        weight: Number(fields.weight) || 0,
        minRequirement: fields.minRequirement !== undefined && fields.minRequirement !== ""
          ? Number(fields.minRequirement)
          : undefined,
        live: fields.live !== false,
        fixed: Boolean(fields.fixed),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapDomain({ ...data.domain, questions: data.domain?.questions || [] });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateLaunchDomain(token, id, fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.weight !== undefined) payload.weight = Number(fields.weight);
  if (fields.minRequirement !== undefined) payload.minRequirement = Number(fields.minRequirement);
  if (fields.live !== undefined) payload.live = Boolean(fields.live);
  if (fields.fixed !== undefined) payload.fixed = Boolean(fields.fixed);
  if (fields.sortOrder !== undefined) payload.sortOrder = Number(fields.sortOrder);
  try {
    const { data } = await api.patch(
      `${launchConfigBase()}/domains/${encodeURIComponent(id)}`,
      payload,
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapDomain(data.domain);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteLaunchDomain(token, id) {
  try {
    await api.delete(`${launchConfigBase()}/domains/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateLaunchQuestion(token, domainId, fields) {
  try {
    const { data } = await api.post(
      `${launchConfigBase()}/domains/${encodeURIComponent(domainId)}/questions`,
      {
        name: String(fields.name ?? "").trim(),
        points: fields.points !== undefined ? Number(fields.points) : undefined,
        enabled: fields.enabled !== false,
        fixed: Boolean(fields.fixed),
        hasInfo: fields.hasInfo !== false,
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapQuestion(data.question);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateLaunchQuestion(token, domainId, id, fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.points !== undefined) payload.points = Number(fields.points);
  if (fields.enabled !== undefined) payload.enabled = Boolean(fields.enabled);
  if (fields.fixed !== undefined) payload.fixed = Boolean(fields.fixed);
  if (fields.hasInfo !== undefined) payload.hasInfo = Boolean(fields.hasInfo);
  if (fields.sortOrder !== undefined) payload.sortOrder = Number(fields.sortOrder);
  try {
    const { data } = await api.patch(
      `${launchConfigBase()}/domains/${encodeURIComponent(domainId)}/questions/${encodeURIComponent(id)}`,
      payload,
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapQuestion(data.question);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteLaunchQuestion(token, domainId, id) {
  try {
    await api.delete(
      `${launchConfigBase()}/domains/${encodeURIComponent(domainId)}/questions/${encodeURIComponent(id)}`,
      { headers: authHeader(tokenOrStored(token)) },
    );
  } catch (error) {
    normalizeApiError(error);
  }
}

function mapFocusArea(row) {
  if (!row) return null;
  const domainId = String(row.domainId || "").trim();
  return {
    id: row.id || row._id,
    title: row.title || "",
    domainId: domainId || "",
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    status: row.status === "inactive" ? "inactive" : "active",
  };
}

export async function adminListLaunchFocusAreas(token) {
  const headers = authHeader(tokenOrStored(token));
  const rows = [];
  let page = 1;
  let pages = 1;
  try {
    do {
      const { data } = await api.get("/admin/launch-focus-areas", {
        params: { page, limit: 200 },
        headers,
      });
      rows.push(...(Array.isArray(data.focusAreas) ? data.focusAreas : []));
      pages = Number(data.pagination?.pages) || 1;
      page += 1;
    } while (page <= pages && page <= 20);
    return rows
      .map(mapFocusArea)
      .filter(Boolean)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateLaunchFocusArea(token, fields) {
  try {
    const { data } = await api.post(
      "/admin/launch-focus-areas",
      {
        title: String(fields.title ?? "").trim(),
        domainId: String(fields.domainId ?? "").trim(),
        sortOrder: Number(fields.sortOrder) || 0,
        status: fields.status === "inactive" ? "inactive" : "active",
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapFocusArea(data.focusArea);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateLaunchFocusArea(token, id, fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.domainId !== undefined) payload.domainId = String(fields.domainId).trim();
  if (fields.sortOrder !== undefined) payload.sortOrder = Number(fields.sortOrder);
  if (fields.status !== undefined) payload.status = fields.status === "inactive" ? "inactive" : "active";
  try {
    const { data } = await api.patch(
      `/admin/launch-focus-areas/${encodeURIComponent(id)}`,
      payload,
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapFocusArea(data.focusArea);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteLaunchFocusArea(token, id) {
  try {
    await api.delete(`/admin/launch-focus-areas/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
