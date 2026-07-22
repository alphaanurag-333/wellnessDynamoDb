export { formatDateTime } from "../../utils/formatDate.js";
export const LIST_LIMIT = 20;
export const LIST_SEARCH_MAX_LEN = 80;
export const MESSAGE_PREVIEW_LEN = 64;

export const INQUIRY_TYPE_OPTIONS = [
  { value: "consultation", label: "Book Consultation" },
  { value: "program", label: "Health Program" },
  { value: "appointment", label: "Appointment" },
  { value: "general", label: "General Inquiry" },
];

export const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
];

export const STATUS_FILTER_OPTIONS = [{ value: "", label: "All" }, ...STATUS_OPTIONS];

export const pillBarStyle = {
  background: "#efeff4",
  borderRadius: 999,
  padding: 4,
  display: "grid",
  gap: 4,
  marginBottom: 12,
  maxWidth: 420,
};

export function pillButtonStyle(active) {
  return {
    border: 0,
    borderRadius: 999,
    padding: "8px 12px",
    background: active ? "#fff" : "transparent",
    fontWeight: 500,
    fontSize: "0.875rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
}

export function getContactInquiryId(row) {
  return row?.id || row?._id || "";
}


export function inquiryTypeLabel(value) {
  const match = INQUIRY_TYPE_OPTIONS.find((o) => o.value === value);
  return match?.label || value || "—";
}

export function statusLabel(value) {
  const match = STATUS_OPTIONS.find((o) => o.value === value);
  return match?.label || value || "—";
}

export function truncateText(text, maxLen = MESSAGE_PREVIEW_LEN) {
  const s = String(text || "").trim();
  if (s.length <= maxLen) return s || "—";
  return `${s.slice(0, maxLen)}…`;
}

export function fullName(row) {
  const first = String(row?.firstName || "").trim();
  const last = String(row?.lastName || "").trim();
  const name = [first, last].filter(Boolean).join(" ");
  return name || "—";
}

export function InquiryStatusBadge({ status }) {
  const value = String(status || "").toLowerCase();
  if (value === "new") {
    return <span className="badge badge--warning">New</span>;
  }
  if (value === "read") {
    return <span className="badge badge--success">Read</span>;
  }
  if (value === "archived") {
    return <span className="badge badge--muted">Archived</span>;
  }
  return <span className="badge badge--muted">{status || "—"}</span>;
}
