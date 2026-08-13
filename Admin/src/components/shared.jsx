import { Link } from "react-router-dom";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

export function PageEnter({ children }) {
  return <div className="ua-page-enter">{children}</div>;
}

export function AutosaveButton({ onClick }) {
  return (
    <button type="button" className="ua-autosave-btn" title="Autosaved · click to save now" onClick={onClick}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
      </svg>
    </button>
  );
}

export function BackLink({ label = "Dashboard", to = UPDATED_ADMIN_PATHS.dashboard }) {
  return (
    <Link to={to} className="ua-back-link">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Back to {label}
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
  autosave,
  onAutosave,
  layout = "default",
}) {
  const isSplit = layout === "split";

  return (
    <div className={`page-head${isSplit ? " page-head--split" : ""}`}>
      {isSplit && autosave ? (
        <span className="page-head__autosave">
          <AutosaveButton onClick={onAutosave} />
        </span>
      ) : null}
      <div className="page-head__main">
        {backLink ? <BackLink label={backLink} to={backTo ?? UPDATED_ADMIN_PATHS.dashboard} /> : null}
        <div className="page-head__intro">
          <h1 className="page-head__title">{title}</h1>
          {meta ? <div className="page-head__meta">{meta}</div> : null}
          {!isSplit && subtitle ? <p className="page-head__sub">{subtitle}</p> : null}
        </div>
        {isSplit && subtitle ? <p className="page-head__sub">{subtitle}</p> : null}
      </div>
      <div className="page-head__actions">
        {actions}
        {!isSplit && autosave ? <AutosaveButton onClick={onAutosave} /> : null}
      </div>
    </div>
  );
}

export function PillTabs({ tabs, active, onChange, size = "sm" }) {
  return (
    <div className={`ua-pill-tabs ua-pill-tabs--${size}`} role="tablist">
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

export function OrangeButton({ children, onClick, type = "button" }) {
  return (
    <button type={type} className="ua-btn-orange" onClick={onClick}>
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
