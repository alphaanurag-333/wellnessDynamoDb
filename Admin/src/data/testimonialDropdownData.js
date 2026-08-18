import { categorySlug, categoryTitle, mapDropdownCategoryOptions } from "./recipesConfigData.js";

export const TESTIMONIAL_POINT_SLUG = "testimonial-point";
export const TESTIMONIAL_PAGE_SIZE = 20;

const NAME_FIELDS = new Set(["client_name", "name"]);
const DURATION_FIELDS = new Set(["duration", "time_taken", "months"]);
const INCHES_FIELDS = new Set(["inches_lost", "inches", "waist"]);

export function mapTestimonialPointOptions(list, fallback = []) {
  const options = mapDropdownCategoryOptions(list);
  if (options.length) return options;
  return fallback.map((entry) => ({
    id: entry.id || entry.value,
    value: entry.value || entry.id,
    label: entry.label,
  }));
}

export function fieldKey(value) {
  return categorySlug(value);
}

export function parseFirstNumber(value) {
  const match = String(value || "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

export function parseDurationMonths(value, fallback = 1) {
  const num = parseFirstNumber(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(120, Math.max(1, Math.round(num)));
}

export function parseInchesLost(value) {
  const num = parseFirstNumber(value);
  if (!Number.isFinite(num) || num === 0) return null;
  const abs = Math.abs(num);
  if (abs < 1 || abs > 50) return null;
  return Math.round(abs * 10) / 10;
}

export function findPoint(points = [], keys) {
  return points.find((row) => keys.has(fieldKey(row.field)) || keys.has(fieldKey(row.label)));
}

export function pointsToTransformationFields(points = []) {
  const namePoint = findPoint(points, NAME_FIELDS);
  const durationPoint = findPoint(points, DURATION_FIELDS);
  const inchesPoint = findPoint(points, INCHES_FIELDS);
  const extras = points.filter((row) => {
    const key = fieldKey(row.field) || fieldKey(row.label);
    return !NAME_FIELDS.has(key) && !DURATION_FIELDS.has(key) && !INCHES_FIELDS.has(key);
  });
  const extraValues = extras.map((row) => String(row.value || "").trim()).filter(Boolean);
  const name = String(namePoint?.value || "").trim();
  return {
    name,
    timeTaken: parseDurationMonths(durationPoint?.value, 1),
    inchesLost: parseInchesLost(inchesPoint?.value),
    achievements: extraValues.join(", ") || name || "Transformation",
    dataPoints: points,
  };
}

export function pointsToPayload(points = []) {
  return points.map((row) => ({
    id: row.id || row.field,
    field: row.field,
    label: row.label,
    value: String(row.value || "").trim(),
  }));
}

export function defaultDraftPoints(options = []) {
  const preferred = ["client_name", "duration", "inches_lost"];
  const picked = [];
  for (const key of preferred) {
    const match = options.find((row) => fieldKey(row.value) === key || fieldKey(row.label) === key);
    if (match) picked.push(match);
  }
  const source = picked.length ? picked : options.slice(0, 2);
  return source.map((row) => ({
    id: `dp-${row.value}`,
    field: row.value,
    label: row.label,
    value: "",
    source: "AUTO",
  }));
}

export function healthConcernIdOptions(concerns = []) {
  return (Array.isArray(concerns) ? concerns : [])
    .filter((row) => row && row.status !== "inactive")
    .map((row) => {
      const label = String(row.title || "").trim();
      const id = String(row.id || "").trim();
      return {
        id,
        value: id,
        label: label || categoryTitle(id),
      };
    })
    .filter((row) => row.value && row.label);
}
