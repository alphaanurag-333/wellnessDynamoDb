export const SOP_CATEGORIES = [
  { id: "onboarding", label: "Onboarding" },
  { id: "escalation", label: "Escalation" },
  { id: "nutrition", label: "Nutrition" },
  { id: "reviews", label: "Reviews" },
  { id: "payments", label: "Payments" },
];

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

export function withStepCount(sop) {
  const steps = Array.isArray(sop?.steps) ? sop.steps : [];
  return { ...sop, steps, stepCount: steps.length };
}
