function optionValueFromLabel(label) {
  return String(label || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function normalizeDataPoints(raw) {
  let parsed = raw;
  if (parsed == null || parsed === "") return [];
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new Error("dataPoints must be valid JSON");
    }
  }
  if (!Array.isArray(parsed)) throw new Error("dataPoints must be an array");
  return parsed
    .map((row, index) => {
      const label = String(row?.label || "").trim();
      const value = String(row?.value || "").trim();
      const field = String(row?.field || row?.id || "").trim() || optionValueFromLabel(label);
      if (!label && !field) return null;
      return {
        id: String(row?.id || field || `dp-${index + 1}`).trim(),
        field,
        label: label || field,
        value,
      };
    })
    .filter(Boolean);
}

module.exports = {
  normalizeDataPoints,
};
