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

export function rankBadge(rank) {
  const n = Number(rank);
  if (n === 1) return "🥇 Rank #1";
  if (n === 2) return "🥈 Rank #2";
  if (n === 3) return "🥉 Rank #3";
  return `Rank #${rank ?? "—"}`;
}

export function localTodayDateOnly() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentMonth() {
  return localTodayDateOnly().slice(0, 7);
}

export function monthYearFromDate(dateStr) {
  const s = String(dateStr || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  return s.slice(0, 7);
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
