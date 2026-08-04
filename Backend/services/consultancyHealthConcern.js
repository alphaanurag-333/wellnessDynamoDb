const {
  getHealthConcernById,
  ensureOtherHealthConcern,
} = require("../models/healthConcernModel");

const MAX_HEALTH_CONCERN_OTHER_LENGTH = 100;
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

module.exports = {
  parseHealthConcernIdFromBody,
  parseHealthConcernOtherFromBody,
  resolveHealthConcernForConsultancy,
  isOtherHealthConcernTitle,
  OTHER_HEALTH_CONCERN_SENTINEL,
  MAX_HEALTH_CONCERN_OTHER_LENGTH,
};
