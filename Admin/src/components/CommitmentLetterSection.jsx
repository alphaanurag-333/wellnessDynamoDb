import { useEffect, useMemo, useState } from "react";
import {
  COMMITMENT_COACH_SIGNOFFS,
  COMMITMENT_LETTER_DEFAULT,
  COMMITMENT_LETTER_VERSION,
  commitmentRemindMessage,
  pendingCoachCount,
} from "../data/commitmentLetterData.js";

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      <div className="ua-cfg-panel__head">
        <div>
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function CommitmentRemindModal({ coach, version, onClose, onToast }) {
  const defaultMessage = useMemo(
    () => commitmentRemindMessage(coach.name, version),
    [coach.name, version],
  );
  const [message, setMessage] = useState(defaultMessage);
  const canReset = message !== defaultMessage;

  useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-team-modal ua-team-modal--remind ua-cfg-cl-remind"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="cl-remind-title"
      >
        <div className="ua-team-modal__head ua-team-modal__head--remind">
          <span className="ua-client-remind__icon" aria-hidden="true">🔔</span>
          <div className="ua-team-modal__head-copy">
            <div id="cl-remind-title" className="ua-team-modal__title">Remind {coach.name}</div>
            <div className="ua-team-modal__sub">
              Commitment letter v{version} · unsigned
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
                Reset to suggested
              </button>
            </div>
            <textarea
              className="ua-team-remind__message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="ua-team-remind__actions">
          <button
            type="button"
            className="ua-team-remind__push"
            onClick={() => {
              onToast(`Reminder pushed to ${coach.name.split(" ")[0]}'s app`);
              onClose();
            }}
          >
            <span aria-hidden="true">📱</span> Push to app
          </button>
          <button
            type="button"
            className="ua-team-remind__whatsapp"
            onClick={() => {
              onToast(`WhatsApp sent to ${coach.name}`);
              onClose();
            }}
          >
            <span aria-hidden="true">💬</span> Send on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommitmentLetterSection({
  text,
  setText,
  savedText,
  setSavedText,
  coaches,
  version = COMMITMENT_LETTER_VERSION,
  onToast,
}) {
  const [remindCoachId, setRemindCoachId] = useState(null);

  const isDirty = text.trim() !== savedText.trim();
  const pendingCount = pendingCoachCount(coaches);
  const remindCoach = coaches.find((entry) => entry.id === remindCoachId) ?? null;

  function saveText() {
    const next = text.trim();
    if (!next) {
      onToast("Letter text cannot be empty");
      return;
    }
    setText(next);
    setSavedText(next);
    onToast("Commitment letter saved");
  }

  function resetToDefault() {
    setText(COMMITMENT_LETTER_DEFAULT);
    onToast("Reset to default text");
  }

  return (
    <>
      <Panel
        className="ua-cfg-cl"
        title="Commitment letter"
        subtitle="Signed by the wellness coach at onboarding and shareable with clients."
      >
        <textarea
          className="ua-cfg-cl__textarea"
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />

        <div className="ua-cfg-cl__actions">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={saveText}>
            Save text
          </button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={resetToDefault}>
            Reset to default
          </button>
          <span className="ua-cfg-cl__status">
            {isDirty ? "Not saved yet" : "Saved"} · v{version}
          </span>
        </div>

        <div className="ua-cfg-cl-signoff">
          <div className="ua-cfg-cl-signoff__head">
            <h4 className="ua-cfg-cl-signoff__title">Coach sign-off</h4>
            {pendingCount ? (
              <span className="ua-cfg-cl-signoff__badge">
                {pendingCount} of {coaches.length} coaches still to sign v{version}
              </span>
            ) : (
              <span className="ua-cfg-cl-signoff__badge ua-cfg-cl-signoff__badge--done">
                All coaches signed v{version}
              </span>
            )}
          </div>

          <div className="ua-cfg-cl-coaches">
            {coaches.map((coach) => (
              <div key={coach.id} className="ua-cfg-cl-coach">
                <span
                  className="ua-cfg-cl-coach__avatar"
                  style={{ backgroundColor: coach.color }}
                  aria-hidden="true"
                >
                  {coach.initials}
                </span>
                <div className="ua-cfg-cl-coach__meta">
                  <strong>{coach.name}</strong>
                  <span className={`ua-cfg-cl-coach__status is-${coach.status}`}>
                    {coach.status === "pending" ? "Pending" : "Signed"}
                  </span>
                </div>
                {coach.status === "pending" ? (
                  <button
                    type="button"
                    className="ua-cfg-cl-coach__remind"
                    aria-label={`Remind ${coach.name}`}
                    onClick={() => setRemindCoachId(coach.id)}
                  >
                    ↻
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="ua-cfg-cl-signature">
          <div>
            <span className="ua-cfg-cl-signature__label">Coach signature</span>
            <span className="ua-cfg-cl-signature__hint">Captured at onboarding</span>
          </div>
          <div className="ua-cfg-cl-signature__box">Signature</div>
        </div>
      </Panel>

      {remindCoach ? (
        <CommitmentRemindModal
          coach={remindCoach}
          version={version}
          onClose={() => setRemindCoachId(null)}
          onToast={onToast}
        />
      ) : null}
    </>
  );
}

export {
  COMMITMENT_COACH_SIGNOFFS,
  COMMITMENT_LETTER_DEFAULT,
  COMMITMENT_LETTER_VERSION,
} from "../data/commitmentLetterData.js";
