const { normalizeMarkerKey } = require("./labReportAi");

const TG_MARKER_KEYS = new Set(
  [
    "triglycerides",
    "trig",
    "tg",
    "serumtriglycerides",
    "serumtriglyceride",
    "triglyceride",
    "totaltriglycerides",
  ].map(normalizeMarkerKey)
);

const GGT_MARKER_KEYS = new Set(
  [
    "ggt",
    "ggtase",
    "gammaglutamyltransferase",
    "gammaglutamyltranspeptidase",
    "gammaglutamyltransferaseggt",
  ].map(normalizeMarkerKey)
);

function parseLabNumericValue(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "—" || text === "-") return null;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function markerKeyMatches(name, allowedKeys) {
  const key = normalizeMarkerKey(name);
  if (!key) return false;
  if (allowedKeys.has(key)) return true;
  for (const allowed of allowedKeys) {
    if (key.includes(allowed) || allowed.includes(key)) return true;
  }
  return false;
}

function findMarkerValueInAiAnalysis(aiAnalysis, allowedKeys) {
  const panels = aiAnalysis?.panels;
  if (!Array.isArray(panels)) return null;

  for (const panel of panels) {
    for (const row of panel?.rows || []) {
      if (!markerKeyMatches(row?.name, allowedKeys)) continue;
      const parsed = parseLabNumericValue(row?.value);
      if (parsed != null) return parsed;
    }
  }
  return null;
}

function extractFattyLiverLabsFromAnalysis(aiAnalysis) {
  if (!aiAnalysis?.panels?.length) return { triglycerides: null, ggt: null };
  return {
    triglycerides: findMarkerValueInAiAnalysis(aiAnalysis, TG_MARKER_KEYS),
    ggt: findMarkerValueInAiAnalysis(aiAnalysis, GGT_MARKER_KEYS),
  };
}

module.exports = {
  TG_MARKER_KEYS,
  GGT_MARKER_KEYS,
  parseLabNumericValue,
  findMarkerValueInAiAnalysis,
  extractFattyLiverLabsFromAnalysis,
};
