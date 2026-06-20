export const LIST_LIMIT = 10;
export { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";
export const MESSAGE_MAX_LEN = 1000;

export const SEND_AUDIENCE_OPTIONS = [
  { value: "users", label: "Users" },
  { value: "coaches", label: "Coaches" },
];

export const LIST_AUDIENCE_OPTIONS = [{ value: "", label: "All audiences" }, ...SEND_AUDIENCE_OPTIONS];

export function emptyForm(audienceType = "users") {
  return { audienceType, message: "", status: "active" };
}

export function sanitizeMessageInput(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, MESSAGE_MAX_LEN);
}

export function audienceLabel(type) {
  return SEND_AUDIENCE_OPTIONS.find((x) => x.value === type)?.label || type || "—";
}

export function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export const pillBarStyle = {
  background: "#efeff4",
  borderRadius: 999,
  padding: 4,
  display: "grid",
  gap: 4,
};

export function pillButtonStyle(active) {
  return {
    border: 0,
    borderRadius: 999,
    padding: "8px 10px",
    background: active ? "#fff" : "transparent",
    fontWeight: 500,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
}
