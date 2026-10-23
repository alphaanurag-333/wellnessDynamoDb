import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { mapCounsellingHistoryModalItems } from "../../utils/counsellingReviewHistory.js";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

/**
 * Counselling / review history — same coach meeting list as Counselling → Review Tracking.
 */
export function ReviewHistoryModal({
  user,
  meetings = [],
  assignments = [],
  loading = false,
  onClose,
  onNavigate,
}) {
  const items = useMemo(
    () => mapCounsellingHistoryModalItems(meetings, assignments),
    [meetings, assignments],
  );

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
              <div id="review-history-title" className="ua-cp-review-modal__title">Counselling history</div>
              <div className="ua-cp-review-modal__sub">
                {user?.name || "Client"} · coach check-ins over time
              </div>
            </div>
          </div>
          <button type="button" className="ua-cp-review-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-cp-review-modal__list">
          {loading ? (
            <div className="ua-cp-review-modal__empty">
              <p className="ua-cp-review-modal__empty-text">Loading counselling history…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="ua-cp-review-modal__empty">
              <p className="ua-cp-review-modal__empty-text">No counselling history yet.</p>
            </div>
          ) : (
            items.map((item, index) => (
              <article
                key={item.id}
                className={`ua-cp-review-item${item.cancelled ? " ua-cp-review-item--cancelled" : ""}`}
              >
                <div className="ua-cp-review-item__rail" aria-hidden="true">
                  <span className="ua-cp-review-item__dot" />
                  {index < items.length - 1 ? <span className="ua-cp-review-item__line" /> : null}
                </div>
                <div className="ua-cp-review-item__body">
                  <div className="ua-cp-review-item__top">
                    <div className="ua-cp-review-item__meta">
                      <strong>{item.reviewLabel}</strong>
                      <span>{item.dateLabel}</span>
                      <span>
                        {item.statusLabel}
                        {" · "}
                        Schedule by {item.scheduleByLabel}
                      </span>
                    </div>
                    {item.hasPrescription ? (
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
                  <p className="ua-cp-review-item__note">{item.summary}</p>
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
