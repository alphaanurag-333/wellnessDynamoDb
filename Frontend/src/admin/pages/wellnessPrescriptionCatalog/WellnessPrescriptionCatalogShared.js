export { formatDate } from "../../utils/formatDate.js";
export const LIST_LIMIT = 10;
export const LIST_SEARCH_MAX_LEN = 50;
export const TITLE_MIN_LEN = 2;
export const TITLE_MAX_LEN = 200;
export const CATEGORY_MIN_LEN = 2;
export const CATEGORY_MAX_LEN = 100;
export const PRESCRIPTION_ID_MAX_LEN = 80;
export const POINT_MAX_LEN = 2000;
export const MAX_POINTS = 50;

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sanitizeTitle(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, TITLE_MAX_LEN);
}

export function sanitizeCategory(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, CATEGORY_MAX_LEN);
}

export function sanitizePoint(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, POINT_MAX_LEN);
}

export function sanitizeSequence(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits.slice(0, 6);
}

export function emptyPoint() {
  return "";
}

export function emptyForm() {
  return {
    title: "",
    prescriptionId: "",
    category: "",
    status: "active",
    sequence: "0",
    points: [emptyPoint()],
  };
}


export function listCountSubtitle(loading, total, singular, plural) {
  if (loading) return "Loading…";
  if (!total) return `No ${plural} found`;
  return `${total} ${total === 1 ? singular : plural}`;
}

export function validateForm(form) {
  const title = String(form.title || "").trim();
  const category = String(form.category || "").trim();
  const prescriptionId = slugify(form.prescriptionId || title);
  const status = String(form.status || "active").toLowerCase();
  const sequenceRaw = String(form.sequence ?? "0").trim();
  const points = Array.isArray(form.points) ? form.points : [];

  if (!title) return "Title is required.";
  if (title.length < TITLE_MIN_LEN) return `Title must be at least ${TITLE_MIN_LEN} characters.`;
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;

  if (!category) return "Category is required.";
  if (category.length < CATEGORY_MIN_LEN) return `Category must be at least ${CATEGORY_MIN_LEN} characters.`;
  if (category.length > CATEGORY_MAX_LEN) return `Category cannot exceed ${CATEGORY_MAX_LEN} characters.`;

  if (!prescriptionId) return "Prescription ID is required (auto-generated from title if left blank).";
  if (prescriptionId.length > PRESCRIPTION_ID_MAX_LEN) {
    return `Prescription ID cannot exceed ${PRESCRIPTION_ID_MAX_LEN} characters.`;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(prescriptionId)) {
    return "Prescription ID must use lowercase letters, numbers, and hyphens only.";
  }

  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  if (sequenceRaw === "" || !/^\d+$/.test(sequenceRaw)) {
    return "Sequence must be a non-negative whole number.";
  }

  if (!points.length) return "At least one recommendation point is required.";
  if (points.length > MAX_POINTS) return `Cannot have more than ${MAX_POINTS} points.`;

  for (let i = 0; i < points.length; i += 1) {
    const text = String(points[i] || "").trim();
    if (!text) return `Point ${i + 1}: text is required.`;
    if (text.length > POINT_MAX_LEN) return `Point ${i + 1}: cannot exceed ${POINT_MAX_LEN} characters.`;
  }

  return "";
}

export function toPayload(form) {
  return {
    title: String(form.title || "").trim(),
    prescriptionId: slugify(form.prescriptionId || form.title),
    category: String(form.category || "").trim(),
    status: form.status || "active",
    sequence: Number(form.sequence) || 0,
    points: (form.points || []).map((p) => String(p || "").trim()).filter(Boolean),
  };
}

export function formFromPrescription(prescription) {
  if (!prescription) return emptyForm();
  return {
    title: prescription.title || "",
    prescriptionId: prescription.prescriptionId || "",
    category: prescription.category || "",
    status: prescription.status || "active",
    sequence: prescription.sequence != null ? String(prescription.sequence) : "0",
    points:
      Array.isArray(prescription.points) && prescription.points.length
        ? prescription.points.map((p) => String(p || ""))
        : [emptyPoint()],
  };
}
