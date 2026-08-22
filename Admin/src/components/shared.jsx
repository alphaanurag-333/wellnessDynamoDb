import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

export function PageEnter({ children }) {
  return <div className="ua-page-enter">{children}</div>;
}

export function BackLink({
  label = "Dashboard",
  to = UPDATED_ADMIN_PATHS.dashboard,
  /** When set, replaces the default "Back to {label}" copy (Figma uses plain "Back"). */
  text,
}) {
  return (
    <Link to={to} className="ua-back-link">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {text ?? `Back to ${label}`}
    </Link>
  );
}

export function SectionLabel({ children, hint }) {
  return (
    <div className="ua-section-label">
      <div className="ua-section-label__title">{children}</div>
      {hint ? <span className="ua-section-label__hint">{hint}</span> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  meta,
  backLink,
  backTo,
  layout = "default",
}) {
  const isSplit = layout === "split";
  const showActions = Boolean(actions);

  return (
    <div className={`page-head${isSplit ? " page-head--split" : ""}`}>
      <div className="page-head__main">
        {backLink ? <BackLink label={backLink} to={backTo ?? UPDATED_ADMIN_PATHS.dashboard} /> : null}
        <div className="page-head__intro">
          <h1 className="page-head__title">{title}</h1>
          {meta ? <div className="page-head__meta">{meta}</div> : null}
          {!isSplit && subtitle ? <p className="page-head__sub">{subtitle}</p> : null}
        </div>
        {isSplit && subtitle ? <p className="page-head__sub">{subtitle}</p> : null}
      </div>
      {showActions ? (
        <div className="page-head__actions">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function PillTabs({ tabs, active, onChange, size = "sm" }) {
  return (
    <div style={{marginBottom:"10px",maxWidth:"max-content"}} className={`ua-pill-tabs ua-pill-tabs--${size}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`ua-pill-tabs__btn${active === tab.id ? " ua-pill-tabs__btn--active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count != null ? ` · ${tab.count}` : null}
          {tab.badge ? <span className="ua-pill-tabs__badge">{tab.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function OrangeButton({ children, onClick, type = "button", disabled = false }) {
  return (
    <button type={type} className="ua-btn-orange" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function StatusBadge({ children, tone = "green" }) {
  return <span className={`ua-status ua-status--${tone}`}>{children}</span>;
}

export function ScopeChip() {
  return <span className="chip chip--scope">Global</span>;
}

export function SectionLink({ to, children }) {
  return (
    <Link to={to} className="ua-section-link">
      {children}
    </Link>
  );
}

export function TableScroll({ children }) {
  return <div className="ua-table-scroll">{children}</div>;
}

export function buildPageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => items.add(n));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => items.add(n));
  return Array.from(items)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
    .reduce((acc, n) => {
      if (acc.length && n - acc[acc.length - 1] > 1) acc.push("…");
      acc.push(n);
      return acc;
    }, []);
}

export function CfgSelect({
  options = [],
  value,
  disabled,
  onChange,
  ariaLabel,
  className = "",
  placeholder = "Select…",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((row) => String(row.value) === String(value));
  const isPlaceholder = value === undefined || value === null || String(value) === "";
  const label = selected?.label || placeholder;

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`ua-cfg-select${open ? " is-open" : ""}${className ? ` ${className}` : ""}`} ref={ref}>
      <button
        type="button"
        className="ua-cfg-select__trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((current) => !current)}
      >
        <span className={`ua-cfg-select__value${isPlaceholder ? " is-placeholder" : ""}`}>{label}</span>
        <span className="ua-cfg-select__chev" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="ua-cfg-select__menu" role="listbox">
          {options.length ? options.map((entry) => {
            const isOn = String(entry.value) === String(value);
            return (
              <li key={entry.id || String(entry.value)}>
                <button
                  type="button"
                  className={`ua-cfg-select__option${isOn ? " is-on" : ""}`}
                  role="option"
                  aria-selected={isOn}
                  onClick={() => {
                    onChange(entry.value);
                    setOpen(false);
                  }}
                >
                  {entry.label}
                </button>
              </li>
            );
          }) : (
            <li><span className="ua-cfg-select__empty">No options</span></li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function ListPagination({
  page,
  pages,
  total,
  pageSize,
  onPageChange,
  label = "Pagination",
}) {
  if (!total) return null;
  const safePage = Math.max(1, page || 1);
  const totalPages = Math.max(1, pages || 1);
  const rangeStart = (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, total);
  const pageItems = buildPageItems(safePage, totalPages);

  return (
    <div className="ua-users-pagination" aria-label={label}>
      <div className="ua-users-pagination__meta">
        Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{total}</strong>
        <span className="ua-users-pagination__sep">·</span>
        {pageSize} per page
      </div>
      <div className="ua-users-pagination__controls">
        <button
          type="button"
          className="ua-users-pagination__btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Prev
        </button>
        {pageItems.map((item, idx) => (
          item === "…" ? (
            <span key={`ellipsis-${idx}`} className="ua-users-pagination__ellipsis">…</span>
          ) : (
            <button
              key={item}
              type="button"
              className={`ua-users-pagination__page${item === safePage ? " ua-users-pagination__page--active" : ""}`}
              onClick={() => onPageChange(item)}
              aria-current={item === safePage ? "page" : undefined}
            >
              {item}
            </button>
          )
        ))}
        <button
          type="button"
          className="ua-users-pagination__btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
