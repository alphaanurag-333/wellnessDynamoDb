import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatLongDate } from "../../api/usersApi.js";
import { listUserWellnessPrescriptions } from "../../api/wellnessPrescriptionAssignmentApi.js";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

function formatReviewDate(value) {
  return formatLongDate(value) || "—";
}

function mapAssignmentsToReviewItems(assignments = []) {
  return (Array.isArray(assignments) ? assignments : [])
    .filter(Boolean)
    .map((assignment) => ({
      id: assignment.id,
      date: formatReviewDate(assignment.date || assignment.reviewAt || assignment.createdAt),
      authorName: assignment.authorName || "Coach",
      summary: assignment.summary || "Wellness prescription",
      cancelled: String(assignment.reviewStatus || "active").toLowerCase() === "cancelled",
      hasPrescription: Array.isArray(assignment.items) && assignment.items.length > 0,
    }));
}

/**
 * Live Review history — wellness prescription saves synced to the user app.
 */
export function ReviewHistoryModal({ user, onClose, onNavigate }) {
  const userId = String(user?.id || user?._id || "").trim();
  const [loading, setLoading] = useState(Boolean(userId));
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    listUserWellnessPrescriptions(userId)
      .then((data) => {
        if (cancelled) return;
        const assignments = data?.assignments?.length
          ? data.assignments
          : [
            ...(data?.recommended ? [data.recommended] : []),
            ...(Array.isArray(data?.history) ? data.history : []),
          ];
        setItems(mapAssignmentsToReviewItems(assignments));
      })
      .catch((err) => {
        if (cancelled) return;
        setItems([]);
        setError(err?.message || "Could not load review history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
              <p className="ua-cp-review-modal__empty-text">Loading review history…</p>
            </div>
          ) : error ? (
            <div className="ua-cp-review-modal__empty">
              <p className="ua-cp-review-modal__empty-text">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="ua-cp-review-modal__empty">
              <p className="ua-cp-review-modal__empty-text">No coach reviews yet.</p>
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
                      <strong>{item.date}</strong>
                      <span>by {item.authorName}</span>
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
