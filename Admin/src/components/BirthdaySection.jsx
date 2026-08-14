import { useState } from "react";
import { ChampionSection } from "./ChampionSection.jsx";
import {
  BIRTHDAY_DESIGNS,
  BIRTHDAY_GALLERY_OWNERS,
  BIRTHDAY_QUEUE,
  BIRTHDAY_RUNS,
  BIRTHDAY_TIMES,
} from "../data/birthdayConfigData.js";

function TriggerPanel({ editor, patch, onToast }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          <h3 className="ua-cfg-panel__title">⏱ Automatic trigger</h3>
          <p className="ua-cfg-panel__sub">Runs every night and sends a card to everyone whose birthday it is.</p>
        </div>
        <div className="ua-cfg-bd-trigger__controls">
          <select
            className="ua-cfg-bd-time"
            value={editor.triggerTime}
            onChange={(event) => patch({ triggerTime: event.target.value })}
          >
            {BIRTHDAY_TIMES.map((entry) => (
              <option key={entry} value={entry}>{entry} IST</option>
            ))}
          </select>
          <button
            type="button"
            className={`ua-toggle${editor.triggerOn ? " ua-toggle--on" : ""}`}
            aria-pressed={editor.triggerOn}
            onClick={() => patch({ triggerOn: !editor.triggerOn })}
          >
            <span className="ua-toggle__knob" />
          </button>
        </div>
      </div>
      <div className="ua-cfg-bd-stats">
        <div className="ua-cfg-bd-stat ua-cfg-bd-stat--ok">
          <span>Last run</span>
          <strong>{BIRTHDAY_RUNS.last.when}</strong>
          <p>{BIRTHDAY_RUNS.last.note}</p>
        </div>
        <div className="ua-cfg-bd-stat ua-cfg-bd-stat--next">
          <span>Next run</span>
          <strong>{BIRTHDAY_RUNS.next.when}</strong>
          <p>{BIRTHDAY_RUNS.next.note}</p>
        </div>
        <div className="ua-cfg-bd-stat ua-cfg-bd-stat--fail">
          <span>Failures</span>
          <strong>{BIRTHDAY_RUNS.fail.when}</strong>
          <p>{BIRTHDAY_RUNS.fail.note}</p>
        </div>
      </div>
      <div className="ua-cfg-ch-photo-toggle">
        <span aria-hidden="true">💬</span>
        <div>
          <strong>Auto-retry if the job fails</strong>
          <p>Retries hourly for 6 hours, then alerts admin.</p>
        </div>
        <button
          type="button"
          className={`ua-toggle${editor.retryOn ? " ua-toggle--on" : ""}`}
          aria-pressed={editor.retryOn}
          onClick={() => patch({ retryOn: !editor.retryOn })}
        >
          <span className="ua-toggle__knob" />
        </button>
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => onToast("Birthday job started")}>
          Run now
        </button>
      </div>
    </section>
  );
}

function QueuePanel({ queue, setQueue, onToast }) {
  const sent = queue.filter((entry) => entry.status === "sent").length;
  const queued = queue.filter((entry) => entry.status === "queued").length;
  const failed = queue.filter((entry) => entry.status === "failed").length;

  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          <h3 className="ua-cfg-panel__title">Today's birthdays</h3>
          <p className="ua-cfg-panel__sub">{sent} sent · {queued} queued · {failed} failed</p>
        </div>
      </div>
      <div className="ua-cfg-bd-queue">
        {queue.map((entry) => (
          <article key={entry.id} className="ua-cfg-bd-queue__row">
            <div>
              <strong>{entry.name}</strong>
              <p>{entry.role}</p>
            </div>
            <span className="ua-cfg-bd-queue__time">{entry.time}</span>
            <span className={`ua-cfg-bd-queue__status is-${entry.status}`}>{entry.status}</span>
            {entry.status === "failed" ? (
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm ua-cfg-bd-queue__resend"
                onClick={() => {
                  setQueue((prev) => prev.map((row) => (row.id === entry.id ? { ...row, status: "sent", time: "00:02" } : row)));
                  onToast(`Resent to ${entry.name}`);
                }}
              >
                Resend
              </button>
            ) : (
              <span className="ua-cfg-bd-queue__spacer" />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function BirthdaySection({ editor, setEditor, gallery, setGallery, queue, setQueue, onToast }) {
  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  return (
    <ChampionSection
      editor={editor}
      setEditor={setEditor}
      gallery={gallery}
      setGallery={setGallery}
      onToast={onToast}
      designs={BIRTHDAY_DESIGNS}
      galleryOwners={BIRTHDAY_GALLERY_OWNERS}
      galleryBadge="Birthday card"
      galleryPlaceholder="Birthday card image"
      galleryIcon="🎂"
      sourceName="birthday-photo-source"
      extraAfterAssets={
        <>
          <TriggerPanel editor={editor} patch={patch} onToast={onToast} />
          <QueuePanel queue={queue} setQueue={setQueue} onToast={onToast} />
        </>
      }
    />
  );
}
