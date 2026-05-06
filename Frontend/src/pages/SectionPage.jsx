export function SectionPage({ title, description }) {
  const normalizedTitle = (title || "Section").toLowerCase();

  return (
    <section className="page-card section-page">
      <div className="page-card__head section-page__head">
        <div className="section-page__heading">
          <h1 className="page-card__title section-page__title">{title}</h1>
          {description ? (
            <p className="page-card__desc section-page__desc">{description}</p>
          ) : null}
        </div>
        <div className="page-card__actions section-page__actions">
          <div className="search-field">
            <span className="search-field__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input type="search" placeholder={`Search ${normalizedTitle}...`} />
          </div>
          <button type="button" className="btn btn--ghost">
            Export Data
          </button>
          <button type="button" className="btn btn--primary">
            + Add New
          </button>
        </div>
      </div>

      <div className="section-page__empty">
        <div className="section-page__empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M7 9h10M7 13h6" />
          </svg>
        </div>
        <h2 className="section-page__empty-title">No {normalizedTitle} records yet</h2>
        <p className="section-page__empty-text">
          This module is ready. Start by adding your first entry to see data and management tools here.
        </p>
        <div className="section-page__empty-actions">
          <button type="button" className="btn btn--primary">
            Create First Record
          </button>
          <button type="button" className="btn btn--ghost">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
