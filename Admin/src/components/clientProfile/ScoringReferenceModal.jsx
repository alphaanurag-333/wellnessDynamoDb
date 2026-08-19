import { createPortal } from "react-dom";
import { RATING_SCORES, SCORING_REFERENCE } from "../../data/launchData.js";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

function toRows(ratings) {
  if (Array.isArray(ratings) && ratings.length) {
    return ratings.map((row) => ({
      id: row.id,
      label: row.badge || row.name || row.label || "Rating",
      score: Number(row.points ?? row.score) || 0,
      tone: row.tone || "default",
      desc: row.description || row.desc || "",
    }));
  }
  return SCORING_REFERENCE.map((row) => ({
    id: row.id,
    label: row.label,
    score: row.score,
    tone: row.tone,
    desc: row.desc,
  }));
}

export function ScoringReferenceModal({
  question,
  reply,
  suggestedRating,
  ratings,
  onUseSuggested,
  onClose,
}) {
  const rows = toRows(ratings);
  const suggested = rows.find((row) => row.id === suggestedRating || row.tone === suggestedRating)
    || rows[0];
  const suggestedScore = suggested?.score ?? RATING_SCORES[suggestedRating] ?? 100;
  const suggestedTone = suggested?.tone || "excellent";
  const suggestedLabel = suggested?.label || suggestedRating;

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
            Suggested · {suggestedLabel} · {suggestedScore}
          </div>
        </div>

        <div className="ua-cp-scoring-ref__rows">
          {rows.map((row) => (
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
