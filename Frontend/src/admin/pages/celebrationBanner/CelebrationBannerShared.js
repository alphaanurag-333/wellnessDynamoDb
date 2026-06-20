export const LIST_LIMIT = 10;
export { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";
export const TITLE_MAX_LEN = 50;

export const TYPE_OPTIONS = [
  { value: "birthday", label: "Birthday" },
  { value: "championship", label: "Championship" },
];

export const LIST_TYPE_OPTIONS = [{ value: "", label: "All" }, ...TYPE_OPTIONS];

export function emptyForm(type = "birthday") {
  return { title: "", type, status: "active", startDate: "", endDate: "" };
}

export function sanitizeTitleInput(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, TITLE_MAX_LEN);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function typeLabel(type) {
  return TYPE_OPTIONS.find((x) => x.value === type)?.label || type || "—";
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
