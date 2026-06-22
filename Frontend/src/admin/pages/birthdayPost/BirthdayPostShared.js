export const LIST_LIMIT = 10;
export const MESSAGE_MAX_LEN = 1000;

export const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

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
