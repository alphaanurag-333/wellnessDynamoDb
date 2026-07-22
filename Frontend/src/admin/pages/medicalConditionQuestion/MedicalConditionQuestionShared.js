export { formatDate } from "../../utils/formatDate.js";
export const QUESTION_MIN_LEN = 3;
export const QUESTION_MAX_LEN = 200;
export const QUESTION_PREVIEW_LEN = 80;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;

export const ANSWER_TYPE_OPTIONS = [
  { value: "yes_no", label: "Yes / No" },
  { value: "yes_no_text", label: "Yes / No + Please mention" },
  { value: "text", label: "Text" },
  { value: "date", label: "Date" },
];

const ANSWER_TYPE_LABELS = ANSWER_TYPE_OPTIONS.reduce((acc, o) => {
  acc[o.value] = o.label;
  return acc;
}, {});

export function answerTypeLabel(value) {
  return ANSWER_TYPE_LABELS[value] || value || "—";
}

export function emptyForm() {
  return {
    question: "",
    answerType: "yes_no",
    status: "active",
  };
}

export function sanitizeQuestion(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, QUESTION_MAX_LEN);
}

export function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}


export function validateForm(form) {
  const question = form.question.trim();
  const answerType = String(form.answerType || "").trim();
  const status = String(form.status || "").trim();

  if (!question) return "Question is required.";
  if (question.length < QUESTION_MIN_LEN) return `Question must be at least ${QUESTION_MIN_LEN} characters.`;
  if (question.length > QUESTION_MAX_LEN) return `Question cannot exceed ${QUESTION_MAX_LEN} characters.`;
  if (!ANSWER_TYPE_OPTIONS.some((o) => o.value === answerType)) return "Please select a valid answer type.";
  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  return "";
}
