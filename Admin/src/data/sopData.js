export const SOP_CATEGORIES = [
  { id: "onboarding", label: "Onboarding" },
  { id: "escalation", label: "Escalation" },
  { id: "nutrition", label: "Nutrition" },
  { id: "reviews", label: "Reviews" },
  { id: "payments", label: "Payments" },
];

export const SOP_TITLE_MIN_LEN = 3;
export const SOP_TITLE_MAX_LEN = 100;
export const SOP_STEP_MIN_COUNT = 1;
export const SOP_STEP_MAX_COUNT = 20;
export const SOP_STEP_MAX_LEN = 240;
export const SOP_STEPS_TEXT_MAX_LEN = SOP_STEP_MAX_COUNT * (SOP_STEP_MAX_LEN + 1);

export const SOP_CATEGORY_STYLES = {
  onboarding: { bg: "#e8eefc", color: "#3d5bb5", border: "#c9d6f5" },
  escalation: { bg: "#fdecea", color: "#c0392b", border: "#f5c6c6" },
  nutrition: { bg: "#e7f6ee", color: "#2b8f5b", border: "#bfe6cf" },
  reviews: { bg: "#f3eefc", color: "#7c3aed", border: "#ddd0f5" },
  payments: { bg: "#eef1f7", color: "#5a6b85", border: "#d8dee9" },
};

export function formatSopDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function stepsToText(steps) {
  return Array.isArray(steps) ? steps.join("\n") : "";
}

export function textToSteps(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function sanitizeSopTitle(raw, maxLen = SOP_TITLE_MAX_LEN) {
  return String(raw ?? "").replace(/\s{2,}/g, " ").slice(0, maxLen);
}

export function sanitizeSopStepsText(raw, maxLen = SOP_STEPS_TEXT_MAX_LEN) {
  return String(raw ?? "").slice(0, maxLen);
}

export function validateSopTitle(title) {
  const trimmed = String(title ?? "").trim();
  if (!trimmed) return "Title is required.";
  if (trimmed.length < SOP_TITLE_MIN_LEN) {
    return `Title must be at least ${SOP_TITLE_MIN_LEN} characters.`;
  }
  if (trimmed.length > SOP_TITLE_MAX_LEN) {
    return `Title must be at most ${SOP_TITLE_MAX_LEN} characters.`;
  }
  return "";
}

export function validateSopCategory(category) {
  if (!SOP_CATEGORIES.some((row) => row.id === category)) return "Pick a category.";
  return "";
}

export function validateSopStepsText(text) {
  const steps = textToSteps(text);
  if (steps.length < SOP_STEP_MIN_COUNT) return "Add at least one step.";
  if (steps.length > SOP_STEP_MAX_COUNT) {
    return `Use at most ${SOP_STEP_MAX_COUNT} steps.`;
  }
  const tooLong = steps.findIndex((step) => step.length > SOP_STEP_MAX_LEN);
  if (tooLong !== -1) {
    return `Step ${tooLong + 1} must be at most ${SOP_STEP_MAX_LEN} characters.`;
  }
  return "";
}

export function withStepCount(sop) {
  const steps = Array.isArray(sop?.steps) ? sop.steps : [];
  return { ...sop, steps, stepCount: steps.length };
}
