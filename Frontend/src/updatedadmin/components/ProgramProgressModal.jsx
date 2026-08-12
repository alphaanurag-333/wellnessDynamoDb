function StateBadge({ state, tone }) {
  return <span className={`ua-prog-progress__state ua-prog-progress__state--${tone}`}>{state}</span>;
}

function ChangeBadge({ value }) {
  return <span className="ua-prog-progress__change">{value}</span>;
}

export function ProgramProgressModal({
  open,
  modal,
  onClose,
  onOpenClient,
  onRemind,
}) {
  if (!open || !modal) return null;

  const isOnboarding = modal.type === "onboarding";
  const isWeight = modal.metricKind === "weight";
  const subtitle = isOnboarding
    ? modal.subtitle
    : "Tap a client to open their profile";

  return (
    <div className="ua-team-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`ua-team-modal ua-prog-progress-modal${isOnboarding ? " ua-prog-progress-modal--onboard" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="prog-progress-modal-title"
      >
        <div className="ua-team-modal__head">
          <span className="ua-team-modal__head-icon" aria-hidden="true">{modal.icon}</span>
          <div className="ua-team-modal__head-copy">
            <div id="prog-progress-modal-title" className="ua-team-modal__title">{modal.title}</div>
            <div className="ua-team-modal__sub">{subtitle}</div>
          </div>
          <button type="button" className="ua-team-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-prog-progress-modal__body">
          {isOnboarding ? (
            <>
              <div className="ua-prog-progress-modal__table-head ua-prog-progress-modal__table-head--onboard">
                <div>Client</div>
                <div>Wellness coach</div>
                <div>Onboarding step</div>
                <div>State</div>
                <div>Remind</div>
              </div>
              {modal.rows.map((row) => (
                <div key={row.name} className="ua-prog-progress-modal__row ua-prog-progress-modal__row--onboard">
                  <span className="ua-prog-progress-modal__client">{row.name}</span>
                  <span className="ua-prog-progress-modal__staff">{row.coach}</span>
                  <span className="ua-prog-progress-modal__step">{row.step}</span>
                  <StateBadge state={row.state} tone={row.stateTone} />
                  <button
                    type="button"
                    className="ua-prog-progress-modal__remind"
                    aria-label={`Remind ${row.name}`}
                    onClick={() => onRemind(row)}
                  >
                    🔔
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="ua-prog-progress-modal__table-head ua-prog-progress-modal__table-head--metric">
                <div>Client</div>
                <div>Wellness coach</div>
                <div>{isWeight ? "Initial weight" : "Initial HbA1c"}</div>
                <div>Current</div>
                <div>Change</div>
              </div>
              {modal.rows.map((row) => (
                <button
                  key={row.name}
                  type="button"
                  className="ua-prog-progress-modal__row ua-prog-progress-modal__row--metric"
                  onClick={() => onOpenClient(row)}
                >
                  <span className="ua-prog-progress-modal__client">{row.name}</span>
                  <span className="ua-prog-progress-modal__staff">{row.coach}</span>
                  <span className="ua-prog-progress-modal__muted">{row.start}</span>
                  <span className="ua-prog-progress-modal__current">{row.current}</span>
                  <ChangeBadge value={row.change} />
                </button>
              ))}
            </>
          )}
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
