export function TeamRosterModal({
  open,
  title,
  sectionTitle,
  rows,
  onClose,
  onRemindAll,
  onRemindOne,
}) {
  if (!open) return null;

  return (
    <div className="ua-team-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-team-modal ua-team-modal--roster"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="team-roster-title"
      >
        <div className="ua-team-modal__head">
          <span className="ua-team-modal__head-icon" aria-hidden="true">👥</span>
          <div className="ua-team-modal__head-copy">
            <div id="team-roster-title" className="ua-team-modal__title">{title}</div>
            <div className="ua-team-modal__sub">{sectionTitle}</div>
          </div>
          <button type="button" className="ua-team-modal__remind-all" onClick={onRemindAll}>
            🔔 Remind all
          </button>
          <button type="button" className="ua-team-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-team-modal__body">
          {rows.map((row) => (
            <div key={row.name} className="ua-team-roster-row">
              <div className="ua-team-roster-row__copy">
                <div className="ua-team-roster-row__name">{row.name}</div>
                <div className="ua-team-roster-row__detail">{row.detail}</div>
              </div>
              <button
                type="button"
                className="ua-team-roster-row__remind"
                onClick={() => onRemindOne(row)}
              >
                🔔 Remind
              </button>
            </div>
          ))}
        </div>

        <div className="ua-team-modal__foot">
          <button type="button" className="ua-team-modal__close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
