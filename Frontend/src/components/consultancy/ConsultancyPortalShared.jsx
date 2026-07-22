import { formatDate, formatDateTime } from "../../admin/utils/formatDate.js";

export function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `Rs. ${n.toFixed(2)}`;
}

export { formatDateTime as formatDate, formatDate as formatJoined };

export function PaymentStatusPill({ status }) {
  const value = String(status || "").toLowerCase();
  return <span className={`payment-status-pill payment-status-pill--${value || "pending"}`}>{value || "—"}</span>;
}

export function ConsultancySearchIcon() {
  return (
    <span className="search-field__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </span>
  );
}

export function assigneeLabel(row) {
  if (row?.assigneeSnapshot?.name) return row.assigneeSnapshot.name;
  if (row?.meetingAssigneeType === "assistant_wellness_coach") return "Assistant";
  if (row?.meetingAssigneeType === "wellness_coach") return "Wellness coach";
  if (row?.meetingAssigneeType === "admin") return "Admin";
  return row?.meetingAssigneeType || "—";
}

export function healthConcernLabel(row) {
  return row?.healthConcernSnapshot?.title || row?.healthConcernId || "—";
}
