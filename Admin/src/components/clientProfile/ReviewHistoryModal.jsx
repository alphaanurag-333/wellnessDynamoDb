import { useEffect } from "react";
import { createPortal } from "react-dom";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

/**
 * Live review history only. Seed REVIEW_HISTORY is never shown —
 * wire a real API later; until then show an explicit empty state.
 */
export function ReviewHistoryModal({ user, onClose, onNavigate }) {
  const entries = Array.isArray(user?.reviewHistory) ? user.reviewHistory : [];

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const overlay = (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cp-modal ua-cp-review-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="review-history-title"
      >
        <div className="ua-cp-review-modal__head">
          <div className="ua-cp-review-modal__identity">
            <span className="ua-cp-review-modal__icon" aria-hidden="true">⏱️</span>
            <div>
              <div id="review-history-title" className="ua-cp-review-modal__title">Review history</div>
              <div className="ua-cp-review-modal__sub">{user?.name || "Client"} · coach check-ins over time</div>
            </div>
          </div>
          <button type="button" className="ua-cp-review-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="ua-cp-review-modal__list">
          {entries.length === 0 ? (
            <div className="ua-cp-review-modal__empty">
              <p className="ua-cp-review-modal__empty-text">
                No review history from the API yet. Sample coach notes are not shown.
              </p>
            </div>
          ) : (
            entries.map((entry, index) => (
              <article key={entry.id || `${entry.date}-${index}`} className="ua-cp-review-item">
                <div className="ua-cp-review-item__rail" aria-hidden="true">
                  <span className="ua-cp-review-item__dot" />
                  {index < entries.length - 1 ? <span className="ua-cp-review-item__line" /> : null}
                </div>
                <div className="ua-cp-review-item__body">
                  <div className="ua-cp-review-item__top">
                    <div className="ua-cp-review-item__meta">
                      <strong>{entry.date}</strong>
                      <span>by {entry.coach}</span>
                    </div>
                    {entry.prescription ? (
                      <button
                        type="button"
                        className="ua-cp-review-item__rx"
                        onClick={() => {
                          onClose?.();
                          onNavigate?.("prescription");
                        }}
                      >
                        💊 Wellness prescription ›
                      </button>
                    ) : null}
                  </div>
                  <p className="ua-cp-review-item__note">{entry.note}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const root = getModalRoot();
  return root ? createPortal(overlay, root) : overlay;
}
