export { formatDateTime } from "../../utils/formatDate.js";
export const LIST_LIMIT = 10;

export const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
];

export function statusLabel(status) {
  return STATUS_OPTIONS.find((x) => x.value === status)?.label || status || "—";
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
