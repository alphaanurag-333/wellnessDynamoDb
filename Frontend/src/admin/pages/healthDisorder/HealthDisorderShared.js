export const TITLE_MIN_LEN = 2;
export const TITLE_MAX_LEN = 50;
export const DESCRIPTION_MIN_LEN = 5;
export const DESCRIPTION_MAX_LEN = 500;
export const SYMPTOM_ITEM_MAX_LEN = 200;
export const MAX_SYMPTOM_ROWS = 30;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;

export function emptyForm() {
  return {
    title: "",
    description: "",
    symptoms: [""],
    type: "acute",
    status: "active",
  };
}

export function sanitizeSymptomItem(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, SYMPTOM_ITEM_MAX_LEN);
}

export function symptomsFromApi(list) {
  const rows = Array.isArray(list)
    ? list.map((x) => sanitizeSymptomItem(x).trim()).filter(Boolean)
    : [];
  return rows.length ? rows : [""];
}

export function symptomsToPayload(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((x) => sanitizeSymptomItem(x).trim())
    .filter(Boolean);
}

export function sanitizeTitle(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, TITLE_MAX_LEN);
}

export function sanitizeDescription(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, DESCRIPTION_MAX_LEN);
}

export function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function validateForm(form) {
  const title = form.title.trim();
  const description = form.description.trim();
  const type = String(form.type || "").trim().toLowerCase();
  const status = String(form.status || "").trim().toLowerCase();
  const symptoms = symptomsToPayload(form.symptoms);

  if (!title) return "Title is required.";
  if (title.length < TITLE_MIN_LEN) return `Title must be at least ${TITLE_MIN_LEN} characters.`;
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;
  if (!description) return "Description is required.";
  if (description.length < DESCRIPTION_MIN_LEN) return `Description must be at least ${DESCRIPTION_MIN_LEN} characters.`;
  if (description.length > DESCRIPTION_MAX_LEN) return `Description cannot exceed ${DESCRIPTION_MAX_LEN} characters.`;
  if (!symptoms.length) return "Add at least one symptom.";
  if (type !== "acute" && type !== "chronic") return "Type must be acute or chronic.";
  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  const rows = Array.isArray(form.symptoms) ? form.symptoms : [];
  if (rows.length > MAX_SYMPTOM_ROWS) {
    return `You can add at most ${MAX_SYMPTOM_ROWS} symptom rows.`;
  }

  return "";
}
