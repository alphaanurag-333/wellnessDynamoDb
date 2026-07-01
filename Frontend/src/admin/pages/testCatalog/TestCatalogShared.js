export const LIST_LIMIT = 50;
export const LIST_SEARCH_MAX_LEN = 120;
export const NAME_MAX_LEN = 200;
export const CATEGORY_MAX_LEN = 100;
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
    sequence: 0,
    parameters: [emptyParameter(1)],
  };
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function validateForm(form) {
  if (!String(form.name || "").trim()) return "Test name is required.";
  if (!String(form.category || "").trim()) return "Category is required.";
  if (!form.parameters?.length) return "At least one parameter is required.";
  for (let i = 0; i < form.parameters.length; i += 1) {
    const p = form.parameters[i];
    if (!String(p.name || "").trim()) return `Parameter ${i + 1}: name is required.`;
  }
  return "";
}

export function toPayload(form) {
  return {
    name: String(form.name || "").trim(),
    testId: String(form.testId || slugify(form.name)).trim() || slugify(form.name),
    type: form.type || "SINGLE",
    category: String(form.category || "").trim(),
    status: form.status || "active",
    sequence: Number(form.sequence) || 0,
    parameters: (form.parameters || []).map((p, index) => ({
      paramId: String(p.paramId || slugify(p.name)).trim() || slugify(p.name),
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
    sequence: test.sequence ?? 0,
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
