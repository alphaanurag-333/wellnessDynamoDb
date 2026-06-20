export function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `Rs. ${n.toFixed(2)}`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatJoined(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

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
