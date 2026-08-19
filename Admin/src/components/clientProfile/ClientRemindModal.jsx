import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

export function ClientRemindModal({
  user,
  nextStepLabel,
  defaultMessage,
  whatsapp,
  busy = false,
  onClose,
  onPush,
  onWhatsApp,
}) {
  const [message, setMessage] = useState(defaultMessage);
  const canReset = message !== defaultMessage;

  useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const modal = (
    <div className="ua-team-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-team-modal ua-team-modal--remind ua-client-remind-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="client-remind-title"
      >
        <div className="ua-team-modal__head ua-team-modal__head--remind">
          <span className="ua-client-remind__icon" aria-hidden="true">🔔</span>
          <div className="ua-team-modal__head-copy">
            <div id="client-remind-title" className="ua-team-modal__title">Send a reminder</div>
            <div className="ua-team-modal__sub">
              To {user.name} · next step: {nextStepLabel}
            </div>
          </div>
          <button type="button" className="ua-team-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-team-modal__body ua-team-modal__body--remind">
          <div className="ua-team-remind__section">
            <div className="ua-team-remind__label-row">
              <span className="ua-team-remind__label">Message</span>
              <button
                type="button"
                className={`ua-team-remind__reset${canReset ? "" : " ua-team-remind__reset--muted"}`}
                disabled={!canReset}
                onClick={() => setMessage(defaultMessage)}
              >
                Reset to default
              </button>
            </div>
            <textarea
              className="ua-team-remind__message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            {whatsapp ? (
              <p className="ua-client-remind__whatsapp">
                WhatsApp goes to <strong>{whatsapp}</strong>
              </p>
            ) : null}
          </div>
        </div>

        <div className="ua-team-remind__actions">
          <button
            type="button"
            className="ua-team-remind__push"
            disabled={busy || !message.trim()}
            onClick={() => onPush?.(message)}
          >
            <span aria-hidden="true">📱</span> {busy ? "Sending…" : "Push to app"}
          </button>
          <button
            type="button"
            className="ua-team-remind__whatsapp"
            disabled={busy}
            onClick={() => onWhatsApp?.(message)}
          >
            <span aria-hidden="true">💬</span> Send on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );

  const root = getModalRoot();
  return root ? createPortal(modal, root) : modal;
}
