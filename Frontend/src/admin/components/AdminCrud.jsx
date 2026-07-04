import { useNavigate } from "react-router-dom";

const BackArrowIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18 9 12l6-6" />
  </svg>
);

/**
 * Header for list (index) CRUD pages.
 * Renders inside a `.page-card` above filters/table.
 */
export function AdminListHeader({ title, subtitle, actions }) {
  return (
    <div className="page-card__head admin-crud-head">
      <div className="admin-crud-head__text">
        <h2 className="page-card__title">{title}</h2>
        {subtitle ? <p className="user-page__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="admin-crud-head__actions">{actions}</div> : null}
    </div>
  );
}

/**
 * Header with a back button for detail / add / edit CRUD pages.
 * `backTo` navigates to a path; if omitted, falls back to history back.
 */
export function AdminPageHeader({ title, subtitle, backTo, onBack, actions }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    if (backTo) return navigate(backTo);
    return navigate(-1);
  };

  return (
    <div className="user-page__toolbar admin-page-header">
      <button type="button" className="user-back-btn" aria-label="Back" onClick={handleBack}>
        <BackArrowIcon />
      </button>
      <div className="user-page__toolbar-text">
        <h2 className="user-page__title">{title}</h2>
        {subtitle ? <p className="user-page__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="user-page__toolbar-actions">{actions}</div> : null}
    </div>
  );
}

/**
 * Consistent status pill. Handles active / inactive, plus an optional
 * `blocked` state used by user and coach records.
 */
export function AdminStatusBadge({ status, activeLabel = "Active", inactiveLabel = "Inactive", blockedLabel = "Blocked" }) {
  const value = String(status || "").toLowerCase();
  if (value === "blocked") {
    return <span className="badge badge--danger">{blockedLabel}</span>;
  }
  const isActive = value === "active";
  return (
    <span className={`badge ${isActive ? "badge--success" : "badge--muted"}`}>
      {isActive ? activeLabel : inactiveLabel}
    </span>
  );
}

/**
 * Builds a "N items" subtitle string for list headers.
 */
export function listCountSubtitle(loading, total, singular, plural) {
  if (loading) return `Loading ${plural}…`;
  const count = Number(total) || 0;
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

export const DEFAULT_TABLE_CELL_MAX = 48;

/**
 * Truncate long table text with an ellipsis. Returns display text and optional title for hover.
 */
export function truncateCellText(value, max = DEFAULT_TABLE_CELL_MAX) {
  const s = String(value ?? "").trim();
  if (!s) return { text: "—", title: undefined };
  if (s.length <= max) return { text: s, title: undefined };
  return { text: `${s.slice(0, max)}…`, title: s };
}

/**
 * Consistent table cell text — slices long values and shows full text on hover.
 */
export function TableCellText({ value, max = DEFAULT_TABLE_CELL_MAX, className = "" }) {
  const { text, title } = truncateCellText(value, max);
  return (
    <span className={["data-table__cell-text", className].filter(Boolean).join(" ")} title={title}>
      {text}
    </span>
  );
}
