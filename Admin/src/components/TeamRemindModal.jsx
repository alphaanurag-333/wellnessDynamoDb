export function TeamRemindModal({
  open,
  title,
  subtitle,
  recipients,
  recipientsLoading = false,
  message,
  defaultMessage,
  busy = false,
  actionLabel = "Send Notification",
  actionIcon = "🔔",
  onMessageChange,
  onReset,
  onPush,
  onWhatsApp,
  onClose,
}) {
  if (!open) return null;

  const canReset = message !== defaultMessage;
  const recipientNames = (recipients || []).map((row) =>
    typeof row === "string" ? row : row?.name
  ).filter(Boolean);
  const pushDisabled = busy || recipientsLoading || !String(message || "").trim() || recipientNames.length === 0;

  return (
    <div
      className="ua-team-modal-backdrop ua-team-modal-backdrop--stack"
      onClick={() => {
        if (!busy) onClose?.();
      }}
      role="presentation"
    >
      <div
        className="ua-team-modal ua-team-modal--remind"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="team-remind-title"
      >
        <div className="ua-team-modal__head ua-team-modal__head--remind">
          <span className="ua-team-modal__head-icon" aria-hidden="true">🔔</span>
          <div className="ua-team-modal__head-copy">
            <div id="team-remind-title" className="ua-team-modal__title">{title}</div>
            <div className="ua-team-modal__sub">{subtitle}</div>
          </div>
          <button
            type="button"
            className="ua-team-modal__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="ua-team-modal__body ua-team-modal__body--remind">
          <div className="ua-team-remind__section">
            <div className="ua-team-remind__label">Recipients</div>
            <div className="ua-team-remind__chips">
              {recipientsLoading ? (
                <span className="ua-team-remind__chip">Loading…</span>
              ) : recipientNames.length === 0 ? (
                <span className="ua-team-remind__chip">No recipients</span>
              ) : (
                recipientNames.map((name, index) => (
                  <span key={`${name}-${index}`} className="ua-team-remind__chip">{name}</span>
                ))
              )}
            </div>
          </div>

          <div className="ua-team-remind__section">
            <div className="ua-team-remind__label-row">
              <span className="ua-team-remind__label">Message</span>
              <button
                type="button"
                className={`ua-team-remind__reset${canReset ? "" : " ua-team-remind__reset--muted"}`}
                disabled={!canReset || busy}
                onClick={onReset}
              >
                Reset to suggested
              </button>
            </div>
            <textarea
              className="ua-team-remind__message"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              rows={4}
              disabled={busy}
            />
          </div>
        </div>

        <div className="ua-team-remind__actions">
          <button type="button" className="ua-team-remind__push" disabled={pushDisabled} onClick={onPush}>
            <span aria-hidden="true">{actionIcon}</span> {busy ? "Sending…" : actionLabel}
          </button>
          <button type="button" className="ua-team-remind__whatsapp" disabled={busy} onClick={onWhatsApp}>
            <span aria-hidden="true">💬</span> Send on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
