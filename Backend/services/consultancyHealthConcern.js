const { getHealthConcernById } = require("../models/healthConcernModel");

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

async function resolveHealthConcernForConsultancy(healthConcernId) {
  const id = String(healthConcernId || "").trim();
  if (!id) {
    const err = new Error("healthConcernId is required");
    err.name = "ValidationError";
    throw err;
  }

  const concern = await getHealthConcernById(id);
  if (!concern || String(concern.status || "").toLowerCase() !== "active") {
    const err = new Error("healthConcernId is invalid or inactive");
    err.name = "ValidationError";
    throw err;
  }

  return {
    healthConcernId: concern.id,
    healthConcernSnapshot: {
      id: concern.id,
      title: concern.title || "",
      description: concern.description || "",
      icon: concern.icon || null,
    },
  };
}

module.exports = {
  parseHealthConcernIdFromBody,
  resolveHealthConcernForConsultancy,
};
