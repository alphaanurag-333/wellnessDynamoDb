import { createPortal } from "react-dom";
import { RATING_SCORES, SCORING_REFERENCE } from "../../data/launchData.js";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

function ratingLabel(id) {
  return SCORING_REFERENCE.find((row) => row.id === id)?.label
    ?? id.charAt(0).toUpperCase() + id.slice(1);
}

export function ScoringReferenceModal({
  question,
  reply,
  suggestedRating,
  onUseSuggested,
  onClose,
}) {
  const suggestedScore = RATING_SCORES[suggestedRating] ?? 100;
  const suggestedTone = SCORING_REFERENCE.find((row) => row.id === suggestedRating)?.tone ?? "excellent";

  const modal = (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cp-modal ua-cp-modal--scoring-ref"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="scoring-ref-title"
      >
        <div className="ua-cp-scoring-ref__head">
          <span id="scoring-ref-title" className="ua-cp-scoring-ref__eyebrow">Scoring reference</span>
          <button type="button" className="ua-cp-modal__close ua-cp-scoring-ref__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <h3 className="ua-cp-scoring-ref__question">{question}</h3>

        <div className="ua-cp-scoring-ref__meta">
          <div className="ua-cp-scoring-ref__meta-block">
            <span className="ua-cp-scoring-ref__meta-label">Client replied</span>
            <strong>{reply || "—"}</strong>
          </div>
          <div className={`ua-cp-scoring-ref__suggested ua-cp-scoring-ref__suggested--${suggestedTone}`}>
            Suggested · {ratingLabel(suggestedRating)} · {suggestedScore}
          </div>
        </div>

        <div className="ua-cp-scoring-ref__rows">
          {SCORING_REFERENCE.map((row) => (
            <div key={row.id} className={`ua-cp-scoring-ref__row ua-cp-scoring-ref__row--${row.tone}`}>
              <span className="ua-cp-scoring-ref__row-label">{row.label}</span>
              <span className="ua-cp-scoring-ref__row-score">{row.score}</span>
              <span className="ua-cp-scoring-ref__row-desc">{row.desc}</span>
            </div>
          ))}
        </div>

        <p className="ua-cp-scoring-ref__note">
          Rate the client based on their actual behaviour and consistency — not just their self-reported answer.
          Use the suggested rating as a starting point, then adjust if you know more from coaching notes.
        </p>

        <div className="ua-cp-scoring-ref__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--primary" onClick={onUseSuggested}>
            Use suggested rating
          </button>
          <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  const root = getModalRoot();
  return root ? createPortal(modal, root) : modal;
}
