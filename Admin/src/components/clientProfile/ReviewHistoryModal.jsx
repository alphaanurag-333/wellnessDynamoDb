import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fetchHealConsultancyTracks } from "../../api/counsellingApi.js";

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

/** Same date shape as the app Review Tracking sheet (`en-US` short month). */
function formatReviewDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Maps heal consultancy tracks the same way the mobile app does for
 * "When have I met my Wellness Coach?" / Review Tracking.
 */
function mapTracksToReviewItems(tracks, total) {
  const list = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
  const sorted = [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const count = Number(total) > 0 ? Number(total) : sorted.length;
  return sorted.map((track, index) => ({
    id: track.id || track._id || `track-${index}`,
    reviewNumber: Math.max(count - index, 1),
    date: formatReviewDate(track.createdAt),
  }));
}

/**
 * Live Review Tracking — same heal-consultancy meetings the client sees in-app.
 */
export function ReviewHistoryModal({ user, onClose }) {
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

    fetchHealConsultancyTracks(userId, { page: 1, limit: 50 })
      .then((data) => {
        if (cancelled) return;
        const tracks = data?.tracks || [];
        const total = data?.pagination?.total ?? tracks.length;
        setItems(mapTracksToReviewItems(tracks, total));
      })
      .catch((err) => {
        if (cancelled) return;
        setItems([]);
        setError(err?.message || "Could not load review tracking");
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
            <span className="ua-cp-review-modal__icon" aria-hidden="true">
              <StopwatchIcon />
            </span>
            <div>
              <div id="review-history-title" className="ua-cp-review-modal__title">Review Tracking</div>
              <div className="ua-cp-review-modal__sub">
                {user?.name || "Client"} · when they met their wellness coach
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
              <p className="ua-cp-review-modal__empty-text">Loading review tracking…</p>
            </div>
          ) : error ? (
            <div className="ua-cp-review-modal__empty">
              <p className="ua-cp-review-modal__empty-text">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="ua-cp-review-modal__empty">
              <p className="ua-cp-review-modal__empty-text">No wellness coach meetings yet.</p>
            </div>
          ) : (
            <div className="ua-cp-review-track-list">
              {items.map((item) => (
                <div key={item.id} className="ua-cp-review-track-row">
                  <strong className="ua-cp-review-track-row__label">Review {item.reviewNumber}</strong>
                  <span className="ua-cp-review-track-row__date">{item.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const root = getModalRoot();
  return root ? createPortal(overlay, root) : overlay;
}
