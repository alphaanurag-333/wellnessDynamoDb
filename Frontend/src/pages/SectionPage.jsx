export function SectionPage({ title, description }) {
  return (
    <div className="page-card">
      <div className="page-card__head">
        <div>
          <h2 className="page-card__title">{title}</h2>
          {description ? (
            <p className="page-card__desc">{description}</p>
          ) : null}
        </div>
        <div className="page-card__actions">
          <div className="search-field">
            <span className="search-field__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input type="search" placeholder={`Search ${title.toLowerCase()}...`} />
          </div>
          <button type="button" className="btn btn--ghost">
            Export Data
          </button>
        </div>
      </div>
      <div className="table-placeholder">
        <h1>Coming soon...</h1>
        <p>
          {/* This route renders inside the shared admin layout (sidebar + header). Replace
          this block with your real table or forms for <strong>{title}</strong>. */}

          Content will be added here.
        </p>
      </div>
    </div>
  );
}
