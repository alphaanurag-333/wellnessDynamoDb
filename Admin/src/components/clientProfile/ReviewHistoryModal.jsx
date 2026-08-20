import { useEffect } from "react";
import { createPortal } from "react-dom";
import { getReviewHistory } from "../../data/userDetailData.js";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

function StopwatchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 2.5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 2.5v2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="13.2" r="7.3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10.2v3.2l2.2 1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.2 7.4l1.1-1.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CapsuleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.2" y="5.2" width="11.6" height="5.6" rx="2.8" fill="#f4a5a5" />
      <path d="M8 5.2h5.8a2.8 2.8 0 0 1 0 5.6H8V5.2Z" fill="#f0c75e" />
      <rect x="2.2" y="5.2" width="11.6" height="5.6" rx="2.8" stroke="#c98b3c" strokeWidth="0.7" />
      <path d="M8 5.2v5.6" stroke="#c98b3c" strokeWidth="0.7" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M3.5 1.5 7 5 3.5 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Review history timeline matching the coach check-in design.
 * Prefers user.reviewHistory from the API; falls back to seed until live data exists.
 */
export function ReviewHistoryModal({ user, onClose, onNavigate }) {
  const live = Array.isArray(user?.reviewHistory) ? user.reviewHistory.filter(Boolean) : [];
  const entries = live.length ? live : getReviewHistory(user?.id);

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
            <span className="ua-cp-review-modal__icon" aria-hidden="true">
              <StopwatchIcon />
            </span>
            <div>
              <div id="review-history-title" className="ua-cp-review-modal__title">Review history</div>
              <div className="ua-cp-review-modal__sub">{user?.name || "Client"} · coach check-ins over time</div>
            </div>
          </div>
          <button type="button" className="ua-cp-review-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-cp-review-modal__list">
          {entries.length === 0 ? (
            <div className="ua-cp-review-item ua-cp-review-item--empty">
              <p className="ua-cp-review-item__note">No review history yet.</p>
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
                    <strong className="ua-cp-review-item__date">{entry.date}</strong>
                    {entry.prescription ? (
                      <button
                        type="button"
                        className="ua-cp-review-item__rx"
                        onClick={() => {
                          onClose?.();
                          onNavigate?.("prescription");
                        }}
                      >
                        <CapsuleIcon />
                        <span>Wellness prescription</span>
                        <ChevronIcon />
                      </button>
                    ) : null}
                  </div>
                  {entry.coach ? (
                    <div className="ua-cp-review-item__by">by {entry.coach}</div>
                  ) : null}
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
