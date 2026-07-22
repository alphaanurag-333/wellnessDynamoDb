export { formatDate } from "../../utils/formatDate.js";
export const LIST_LIMIT = 10;
export const LIST_SEARCH_MAX_LEN = 50;
export const NAME_MIN_LEN = 2;
export const NAME_MAX_LEN = 200;
export const CATEGORY_MIN_LEN = 2;
export const CATEGORY_MAX_LEN = 100;
export const TEST_ID_MAX_LEN = 80;
export const PARAM_NAME_MAX_LEN = 100;
export const UNIT_MAX_LEN = 40;
export const REF_RANGE_MAX_LEN = 120;
export const MAX_PARAMETERS = 50;

export const TYPE_OPTIONS = [
  { value: "SINGLE", label: "Single parameter" },
  { value: "PROFILE", label: "Profile (multiple parameters)" },
];

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function typeLabel(value) {
  return TYPE_OPTIONS.find((o) => o.value === value)?.label || value || "—";
}

export function sanitizeName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, NAME_MAX_LEN);
}

export function sanitizeCategory(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, CATEGORY_MAX_LEN);
}

export function sanitizeParamName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, PARAM_NAME_MAX_LEN);
}

export function sanitizeText(value, maxLen) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

export function sanitizeSequence(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits.slice(0, 6);
}

export function emptyParameter(sequence = 1) {
  return { paramId: "", name: "", unit: "", refRange: "", sequence };
}

export function emptyForm() {
  return {
    name: "",
    testId: "",
    type: "SINGLE",
    category: "",
    status: "active",
    sequence: "0",
    parameters: [emptyParameter(1)],
  };
}


export function validateForm(form) {
  const name = String(form.name || "").trim();
  const category = String(form.category || "").trim();
  const testId = slugify(form.testId || name);
  const type = String(form.type || "SINGLE").toUpperCase();
  const status = String(form.status || "active").toLowerCase();
  const sequenceRaw = String(form.sequence ?? "0").trim();
  const parameters = Array.isArray(form.parameters) ? form.parameters : [];

  if (!name) return "Test name is required.";
  if (name.length < NAME_MIN_LEN) return `Test name must be at least ${NAME_MIN_LEN} characters.`;
  if (name.length > NAME_MAX_LEN) return `Test name cannot exceed ${NAME_MAX_LEN} characters.`;

  if (!category) return "Category is required.";
  if (category.length < CATEGORY_MIN_LEN) return `Category must be at least ${CATEGORY_MIN_LEN} characters.`;
  if (category.length > CATEGORY_MAX_LEN) return `Category cannot exceed ${CATEGORY_MAX_LEN} characters.`;

  if (!testId) return "Test ID is required (auto-generated from name if left blank).";
  if (testId.length > TEST_ID_MAX_LEN) return `Test ID cannot exceed ${TEST_ID_MAX_LEN} characters.`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(testId)) {
    return "Test ID must use lowercase letters, numbers, and hyphens only.";
  }

  if (!TYPE_OPTIONS.some((o) => o.value === type)) return "Type must be single parameter or profile.";

  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  if (sequenceRaw === "" || !/^\d+$/.test(sequenceRaw)) {
    return "Sequence must be a non-negative whole number.";
  }

  if (!parameters.length) return "At least one parameter is required.";

  if (type === "SINGLE" && parameters.length !== 1) {
    return "Single-parameter tests must have exactly one parameter.";
  }
  if (type === "PROFILE" && parameters.length < 2) {
    return "Profile tests must have at least two parameters.";
  }
  if (parameters.length > MAX_PARAMETERS) {
    return `A test cannot have more than ${MAX_PARAMETERS} parameters.`;
  }

  const seenParamIds = new Set();
  for (let i = 0; i < parameters.length; i += 1) {
    const p = parameters[i];
    const paramName = String(p.name || "").trim();
    const paramId = slugify(p.paramId || paramName);

    if (!paramName) return `Parameter ${i + 1}: name is required.`;
    if (paramName.length > PARAM_NAME_MAX_LEN) {
      return `Parameter ${i + 1}: name cannot exceed ${PARAM_NAME_MAX_LEN} characters.`;
    }
    if (!paramId) return `Parameter ${i + 1}: param ID is required.`;
    if (paramId.length > TEST_ID_MAX_LEN) {
      return `Parameter ${i + 1}: param ID cannot exceed ${TEST_ID_MAX_LEN} characters.`;
    }
    if (seenParamIds.has(paramId)) {
      return `Parameter ${i + 1}: duplicate param ID "${paramId}".`;
    }
    seenParamIds.add(paramId);

    const unit = String(p.unit || "").trim();
    const refRange = String(p.refRange || "").trim();
    if (unit.length > UNIT_MAX_LEN) return `Parameter ${i + 1}: unit cannot exceed ${UNIT_MAX_LEN} characters.`;
    if (refRange.length > REF_RANGE_MAX_LEN) {
      return `Parameter ${i + 1}: reference range cannot exceed ${REF_RANGE_MAX_LEN} characters.`;
    }
  }

  return "";
}

export function toPayload(form) {
  return {
    name: String(form.name || "").trim(),
    testId: slugify(form.testId || form.name),
    type: form.type || "SINGLE",
    category: String(form.category || "").trim(),
    status: form.status || "active",
    sequence: Number(form.sequence) || 0,
    parameters: (form.parameters || []).map((p, index) => ({
      paramId: slugify(p.paramId || p.name),
      name: String(p.name || "").trim(),
      unit: String(p.unit || "").trim(),
      refRange: String(p.refRange || "").trim(),
      sequence: Number(p.sequence) || index + 1,
    })),
  };
}

export function formFromTest(test) {
  if (!test) return emptyForm();
  return {
    name: test.name || "",
    testId: test.testId || "",
    type: test.type || "SINGLE",
    category: test.category || "",
    status: test.status || "active",
    sequence: test.sequence != null ? String(test.sequence) : "0",
    parameters:
      Array.isArray(test.parameters) && test.parameters.length
        ? test.parameters.map((p, index) => ({
            paramId: p.paramId || "",
            name: p.name || "",
            unit: p.unit || "",
            refRange: p.refRange || "",
            sequence: p.sequence ?? index + 1,
          }))
        : [emptyParameter(1)],
  };
}
