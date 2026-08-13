export function CommunityBroadcastModal({
  open,
  message,
  onMessageChange,
  onClose,
  onSend,
}) {
  if (!open) return null;

  const charCount = message.length;
  const canSend = message.trim().length > 0;

  return (
    <div className="ua-team-modal-backdrop ua-team-modal-backdrop--stack" onClick={onClose} role="presentation">
      <div
        className="ua-team-modal ua-broadcast-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="broadcast-modal-title"
      >
        <div className="ua-team-modal__head ua-team-modal__head--remind">
          <span className="ua-team-modal__head-icon" aria-hidden="true">📣</span>
          <div className="ua-team-modal__head-copy">
            <div id="broadcast-modal-title" className="ua-team-modal__title">Community broadcast</div>
            <div className="ua-team-modal__sub">Review before it goes to every client and coach</div>
          </div>
          <button type="button" className="ua-team-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-team-modal__body ua-broadcast-modal__body">
          <textarea
            className="ua-broadcast-modal__input"
            placeholder="Write your broadcast…"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            rows={6}
            autoFocus
          />
          <div className="ua-broadcast-modal__meta">
            <span>Goes to all clients &amp; coaches in the app</span>
            <span>{charCount} character{charCount === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="ua-broadcast-modal__actions">
          <button type="button" className="ua-broadcast-modal__keep" onClick={onClose}>
            Keep editing
          </button>
          <button
            type="button"
            className="ua-broadcast-modal__send"
            disabled={!canSend}
            onClick={onSend}
          >
            Send broadcast
          </button>
        </div>
      </div>
    </div>
  );
}
