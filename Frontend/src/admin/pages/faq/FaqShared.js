export const QUESTION_MAX_LEN = 160;
export const ANSWER_MAX_LEN = 2000;
export const QUESTION_PREVIEW_LEN = 50;
export const ANSWER_PREVIEW_LEN = 80;
export const LIST_SEARCH_MAX_LEN = 120;
export const LIST_LIMIT = 10;

export function emptyForm() {
  return { question: "", answer: "", status: "active" };
}

export function sanitizeQuestionInput(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, QUESTION_MAX_LEN);
}

export function sanitizeAnswerInput(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, ANSWER_MAX_LEN);
}

export function validateFaqForm(form) {
  const question = String(form.question ?? "").trim();
  const answer = String(form.answer ?? "").trim();
  if (!question || !answer) {
    return "Question and answer are required.";
  }
  if (question.length > QUESTION_MAX_LEN) {
    return `Question cannot exceed ${QUESTION_MAX_LEN} characters.`;
  }
  if (answer.length > ANSWER_MAX_LEN) {
    return `Answer cannot exceed ${ANSWER_MAX_LEN} characters.`;
  }
  const status = String(form.status || "").trim();
  if (status && status !== "active" && status !== "inactive") {
    return "Status must be active or inactive.";
  }
  return "";
}

export function truncateText(value, maxLen) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

export function getFaqId(row) {
  return row?.id || row?._id || "";
}

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}
