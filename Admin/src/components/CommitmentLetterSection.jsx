import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCommitmentLetterConfig,
  listCommitmentLetterCoaches,
  saveCommitmentLetterText,
  sendCommitmentLetterWhatsAppReminder,
} from "../api/coachContentApi.js";
import {
  COMMITMENT_LETTER_DEFAULT,
  COMMITMENT_LETTER_VERSION,
  commitmentRemindMessage,
  normalizeCommitmentLetterText,
  parseCommitmentLetterBlocks,
  pendingCoachCount,
} from "../data/commitmentLetterData.js";

function formatSavedTime(date = new Date()) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

export function CommitmentLetterBody({ text, clientName = "{name}" }) {
  const blocks = useMemo(
    () => parseCommitmentLetterBlocks(text, clientName),
    [clientName, text],
  );

  return (
    <>
      {blocks.map((block, index) =>
        block.type === "list" ? (
          <ul key={`list-${index}`} className="ua-cfg-cl-doc__list">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={`para-${index}`} className="ua-cp-present-letter__para">
            {block.text}
          </p>
        ),
      )}
    </>
  );
}

export function CommitmentLetterDocument({ text, version }) {
  return (
    <div className="ua-cp-present-letter__doc ua-cfg-cl-doc">
      <div className="ua-cp-present-letter__brand">
        <span className="ua-cp-present-letter__logo">IR</span>
        <div>
          <strong>INDIA</strong>
          <span>REDEFINING WELLNESS</span>
        </div>
      </div>
      <hr className="ua-cp-present-letter__rule" />
      <h4 className="ua-cp-present-letter__heading">My commitment</h4>
      <p className="ua-cfg-cl-doc__hint">Use {"{name}"} for the client’s name when this letter is assigned.</p>
      <CommitmentLetterBody text={text} />
      <div className="ua-cp-present-letter__signatures">
        <div className="ua-cp-present-letter__sign-block">
          <span className="ua-cp-present-letter__sign-name">Coach</span>
          <span className="ua-cp-present-letter__sign-line" aria-hidden="true" />
          <span className="ua-cp-present-letter__sign-label">Coach signature</span>
        </div>
        <div className="ua-cp-present-letter__sign-block ua-cp-present-letter__sign-block--date">
          <span className="ua-cp-present-letter__sign-date">
            {version ? `Letter v${version}` : "Date"}
          </span>
          <span className="ua-cp-present-letter__sign-line" aria-hidden="true" />
          <span className="ua-cp-present-letter__sign-label">Signed on</span>
        </div>
      </div>
    </div>
  );
}

function CommitmentRemindModal({ coach, version, onClose, onToast }) {
  const defaultMessage = useMemo(
    () => commitmentRemindMessage(coach.name, version),
    [coach.name, version],
  );
  const [message, setMessage] = useState(defaultMessage);
  const [busyPush, setBusyPush] = useState(false);
  const [busyWhatsApp, setBusyWhatsApp] = useState(false);
  const canReset = message !== defaultMessage;
  const busy = busyPush || busyWhatsApp;

  useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  async function sendWhatsApp() {
    const body = String(message || "").trim();
    if (!body) {
      onToast("Write a reminder message first");
      return;
    }
    if (busy) return;
    setBusyWhatsApp(true);
    try {
      const data = await sendCommitmentLetterWhatsAppReminder({
        accountId: coach.id,
        message: body,
      });
      onToast(data?.message || `WhatsApp sent to ${coach.name}`);
      onClose();
    } catch (error) {
      onToast(error?.message || "Failed to send WhatsApp");
    } finally {
      setBusyWhatsApp(false);
    }
  }

  return (
    <div className="ua-cp-modal-backdrop" onClick={() => { if (!busy) onClose(); }} role="presentation">
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
          <button type="button" className="ua-team-modal__close" onClick={() => { if (!busy) onClose(); }} aria-label="Close">
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
                disabled={!canReset || busy}
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
              disabled={busy}
            />
          </div>
        </div>

        <div className="ua-team-remind__actions">
          <button
            type="button"
            className="ua-team-remind__push"
            disabled={busy}
            onClick={() => {
              setBusyPush(true);
              onToast(`Reminder pushed to ${coach.name.split(" ")[0]}'s app`);
              setBusyPush(false);
              onClose();
            }}
          >
            <span aria-hidden="true">📱</span> {busyPush ? "Sending…" : "Push to app"}
          </button>
          <button
            type="button"
            className="ua-team-remind__whatsapp"
            disabled={busy || !message.trim()}
            onClick={sendWhatsApp}
          >
            <span aria-hidden="true">💬</span> {busyWhatsApp ? "Sending…" : "Send on WhatsApp"}
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
  setCoaches,
  version = COMMITMENT_LETTER_VERSION,
  setVersion,
  onToast,
}) {
  const [remindCoachId, setRemindCoachId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState("");

  const isDirty = text.trim() !== savedText.trim();
  const pendingCount = pendingCoachCount(coaches);
  const remindCoach = coaches.find((entry) => entry.id === remindCoachId) ?? null;

  const loadLetter = useCallback(async () => {
    setLoading(true);
    try {
      const config = await getCommitmentLetterConfig();
      const nextVersion = config?.version || 1;
      const nextText = normalizeCommitmentLetterText(config?.text);
      setText(nextText);
      setSavedText(nextText);
      setSavedAt(formatSavedTime());
      if (typeof setVersion === "function") setVersion(nextVersion);
      const rows = await listCommitmentLetterCoaches(nextVersion);
      if (typeof setCoaches === "function") setCoaches(rows);
    } catch (error) {
      onToast(error?.message || "Failed to load commitment letter");
    } finally {
      setLoading(false);
    }
  }, [onToast, setCoaches, setSavedText, setText, setVersion]);

  useEffect(() => {
    loadLetter();
  }, [loadLetter]);

  async function saveText() {
    const next = text.trim();
    if (!next) {
      onToast("Letter text cannot be empty");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const config = await saveCommitmentLetterText(next);
      const nextText = normalizeCommitmentLetterText(config.text);
      setText(nextText);
      setSavedText(nextText);
      setSavedAt(formatSavedTime());
      if (typeof setVersion === "function") setVersion(config.version);
      if (typeof setCoaches === "function") {
        setCoaches(await listCommitmentLetterCoaches(config.version));
      }
      onToast("Commitment letter saved");
    } catch (error) {
      onToast(error?.message || "Failed to save commitment letter");
    } finally {
      setBusy(false);
    }
  }

  function resetToDefault() {
    setText(COMMITMENT_LETTER_DEFAULT);
    onToast("Reset to default text");
  }

  if (loading) {
    return (
      <Panel title="Commitment letter" subtitle="Loading letter text and coach sign-off from App Config…">
        <p className="ua-cfg-panel__sub">Fetching the current commitment letter…</p>
      </Panel>
    );
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
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={saveText}>
            {busy ? "Saving…" : "Save text"}
          </button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" disabled={busy} onClick={resetToDefault}>
            Reset to default
          </button>
          <span className="ua-cfg-cl__status">
            {isDirty ? "Not saved yet" : savedAt ? `Saved ${savedAt}` : "Saved"} · v{version}
          </span>
        </div>

        <div className="ua-cfg-cl-signoff">
          <div className="ua-cfg-cl-signoff__head">
            <h4 className="ua-cfg-cl-signoff__title">Coach sign-off</h4>
            {pendingCount ? (
              <span className="ua-cfg-cl-signoff__badge">
                {pendingCount} of {coaches.length} coaches still to sign v{version}
              </span>
            ) : coaches.length ? (
              <span className="ua-cfg-cl-signoff__badge ua-cfg-cl-signoff__badge--done">
                All coaches signed v{version}
              </span>
            ) : (
              <span className="ua-cfg-cl-signoff__badge">No wellness coaches yet</span>
            )}
          </div>

          <div className="ua-cfg-cl-coaches">
            {coaches.length ? (
              coaches.map((coach) => (
                <div key={coach.id} className="ua-cfg-cl-coach">
                  <span
                    className="ua-cfg-cl-coach__avatar"
                    style={{ backgroundColor: coach.color }}
                    aria-hidden="true"
                  >
                    {coach.initials}
                  </span>
                  <strong className="ua-cfg-cl-coach__name">{coach.name}</strong>
                  <span className={`ua-cfg-cl-coach__status is-${coach.status}`}>
                    {coach.status === "pending" ? "Pending" : "Signed"}
                  </span>
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
              ))
            ) : (
              <p className="ua-cfg-panel__sub">No active wellness coaches found.</p>
            )}
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
