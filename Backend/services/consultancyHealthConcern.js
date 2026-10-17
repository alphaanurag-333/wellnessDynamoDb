const {
  getHealthConcernById,
  listHealthConcerns,
  ensureOtherHealthConcern,
} = require("../models/healthConcernModel");

const MAX_HEALTH_CONCERN_OTHER_LENGTH = 100;
const MAX_HEALTH_CONCERNS = 20;
const OTHER_HEALTH_CONCERN_SENTINEL = "__other__";

function parseHealthConcernIdFromBody(body) {
  if (!body || typeof body !== "object") return null;
  const raw =
    body.healthConcernId ??
    body.health_concern_id ??
    body.primaryHealthConcern ??
    body.primary_health_concern ??
    null;
  return raw != null ? String(raw).trim() : "";
}

function parseHealthConcernOtherFromBody(body) {
  if (!body || typeof body !== "object") return "";
  const raw =
    body.healthConcernOther ??
    body.health_concern_other ??
    body.primaryHealthConcernOther ??
    body.primary_health_concern_other ??
    body.customHealthConcern ??
    body.custom_health_concern ??
    null;
  return raw != null ? String(raw).trim() : "";
}

function isOtherHealthConcernTitle(title) {
  return String(title || "").trim().toLowerCase() === "other";
}

function validationError(message) {
  const err = new Error(message);
  err.name = "ValidationError";
  return err;
}

function extractHealthConcernToken(entry) {
  if (entry == null) return "";
  if (typeof entry === "string" || typeof entry === "number") {
    return String(entry).trim();
  }
  if (typeof entry === "object") {
    const candidate =
      entry.id ??
      entry._id ??
      entry.title ??
      entry.name ??
      entry.label ??
      entry.value;
    return String(candidate ?? "").trim();
  }
  return "";
}

/** Accepts an id/title, a JSON array string, a comma-separated list, or an array of either. */
function parseHealthConcernTokens(value) {
  if (value == null || value === "") return [];
  let raw = value;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        raw = JSON.parse(trimmed);
      } catch {
        raw = trimmed;
      }
    }
    if (typeof raw === "string") {
      raw = raw.includes(",")
        ? raw.split(",").map((part) => part.trim()).filter(Boolean)
        : [raw];
    }
  } else if (typeof raw === "object" && !Array.isArray(raw)) {
    const keys = Object.keys(raw);
    const isArrayLike = keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
    if (isArrayLike) {
      raw = keys
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => raw[key]);
    } else {
      const token = extractHealthConcernToken(raw);
      return token ? [token] : [];
    }
  }

  const entries = Array.isArray(raw) ? raw : [raw];
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const pieces =
      typeof entry === "string" && entry.includes(",")
        ? entry.split(",").map((part) => part.trim())
        : [extractHealthConcernToken(entry)];
    for (const piece of pieces) {
      const token = String(piece || "").trim();
      if (!token) continue;
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(token);
    }
  }
  return out;
}

function readHealthConcernListBody(body) {
  if (!body || typeof body !== "object") return undefined;
  if (body.healthConcerns !== undefined) return body.healthConcerns;
  if (body.health_concerns !== undefined) return body.health_concerns;
  if (body.primaryHealthConcern !== undefined) return body.primaryHealthConcern;
  if (body.primary_health_concern !== undefined) return body.primary_health_concern;
  return undefined;
}

function matchHealthConcernTokens(tokens, catalog, { healthConcernOther } = {}) {
  const list = Array.isArray(tokens) ? tokens : [];
  if (list.length > MAX_HEALTH_CONCERNS) {
    throw validationError(`at most ${MAX_HEALTH_CONCERNS} health concerns are allowed`);
  }

  const custom = String(healthConcernOther || "").trim();
  if (custom.length > MAX_HEALTH_CONCERN_OTHER_LENGTH) {
    throw validationError(
      `healthConcernOther must be at most ${MAX_HEALTH_CONCERN_OTHER_LENGTH} characters`,
    );
  }

  const byId = new Map();
  const byTitle = new Map();
  for (const row of catalog || []) {
    if (!row?.id) continue;
    if (String(row.status || "active").toLowerCase() !== "active") continue;
    byId.set(String(row.id), row);
    const titleKey = String(row.title || "").trim().toLowerCase();
    if (titleKey && !byTitle.has(titleKey)) byTitle.set(titleKey, row);
  }

  const resolved = [];
  const seen = new Set();
  for (const token of list) {
    const key = String(token || "").trim();
    const concern =
      key === OTHER_HEALTH_CONCERN_SENTINEL
        ? byTitle.get("other")
        : byId.get(key) || byTitle.get(key.toLowerCase());
    if (!concern) {
      const message =
        list.length === 1
          ? "healthConcernId is invalid or inactive"
          : `health concern is invalid or inactive: ${key}`;
      throw validationError(message);
    }
    if (seen.has(concern.id)) continue;
    seen.add(concern.id);
    resolved.push(concern);
  }

  const hasOther = resolved.some((row) => isOtherHealthConcernTitle(row.title));
  if (hasOther && !custom) {
    throw validationError("healthConcernOther is required when concern is Other");
  }

  return {
    healthConcernIds: resolved.map((row) => row.id),
    primaryHealthConcern: resolved[0]?.id || null,
    primaryHealthConcernOther: hasOther ? custom : null,
    concerns: resolved,
  };
}

async function resolveHealthConcernForConsultancy(
  healthConcernId,
  { healthConcernOther } = {},
) {
  let id = String(healthConcernId || "").trim();
  if (!id) {
    const err = new Error("healthConcernId is required");
    err.name = "ValidationError";
    throw err;
  }

  const custom = String(healthConcernOther || "").trim();
  if (custom.length > MAX_HEALTH_CONCERN_OTHER_LENGTH) {
    const err = new Error(
      `healthConcernOther must be at most ${MAX_HEALTH_CONCERN_OTHER_LENGTH} characters`,
    );
    err.name = "ValidationError";
    throw err;
  }

  let concern =
    id === OTHER_HEALTH_CONCERN_SENTINEL
      ? await ensureOtherHealthConcern()
      : await getHealthConcernById(id);

  if (!concern || String(concern.status || "").toLowerCase() !== "active") {
    const { healthConcerns } = await listHealthConcerns({
      page: 1,
      limit: 200,
      status: "active",
    });
    const titleKey = id.toLowerCase();
    concern =
      (healthConcerns || []).find(
        (row) => String(row?.title || "").trim().toLowerCase() === titleKey,
      ) || null;
  }

  if (!concern || String(concern.status || "").toLowerCase() !== "active") {
    const err = new Error("healthConcernId is invalid or inactive");
    err.name = "ValidationError";
    throw err;
  }

  const isOther = isOtherHealthConcernTitle(concern.title);
  if (isOther && !custom) {
    const err = new Error("healthConcernOther is required when concern is Other");
    err.name = "ValidationError";
    throw err;
  }

  const snapshot = {
    id: concern.id,
    title: isOther && custom ? custom : concern.title || "",
    description: concern.description || "",
    icon: concern.icon || null,
  };

  return {
    healthConcernId: concern.id,
    healthConcernSnapshot: snapshot,
  };
}

async function resolveHealthConcernList(raw, { healthConcernOther } = {}) {
  const tokens = parseHealthConcernTokens(raw);
  if (!tokens.length) {
    return {
      healthConcernIds: [],
      primaryHealthConcern: null,
      primaryHealthConcernOther: null,
      concerns: [],
    };
  }

  const { healthConcerns } = await listHealthConcerns({
    page: 1,
    limit: 200,
    status: "active",
  });
  let catalog = Array.isArray(healthConcerns) ? [...healthConcerns] : [];
  const needsOther = tokens.some(
    (token) =>
      token === OTHER_HEALTH_CONCERN_SENTINEL ||
      String(token).trim().toLowerCase() === "other",
  );
  if (needsOther && !catalog.some((row) => isOtherHealthConcernTitle(row?.title))) {
    const other = await ensureOtherHealthConcern();
    if (other?.id) catalog = [...catalog, other];
  }

  return matchHealthConcernTokens(tokens, catalog, { healthConcernOther });
}

module.exports = {
  parseHealthConcernIdFromBody,
  parseHealthConcernOtherFromBody,
  parseHealthConcernTokens,
  readHealthConcernListBody,
  matchHealthConcernTokens,
  resolveHealthConcernForConsultancy,
  resolveHealthConcernList,
  isOtherHealthConcernTitle,
  OTHER_HEALTH_CONCERN_SENTINEL,
  MAX_HEALTH_CONCERN_OTHER_LENGTH,
  MAX_HEALTH_CONCERNS,
};
