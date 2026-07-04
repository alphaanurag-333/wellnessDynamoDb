export function approvalLabel(status) {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending";
}

export function approvalBadgeClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "admin-status-badge admin-status-badge--active";
  if (value === "rejected") return "admin-status-badge admin-status-badge--inactive";
  return "admin-status-badge";
}

export function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export const LIST_LIMIT = 10;
