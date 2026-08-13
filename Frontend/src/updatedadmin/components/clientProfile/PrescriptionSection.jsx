import { useEffect, useRef, useState } from "react";
import {
  PRESCRIPTION_HISTORY,
  PRESCRIPTION_SECTIONS,
  PROTOCOL_POOL,
  sectionsSummary,
  totalPoints,
} from "../../data/prescriptionData.js";

function ProtocolPointRow({ value, onChange, onRemove }) {
  return (
    <div className="ua-cp-rx-point">
      <span className="ua-cp-rx-point__bullet" aria-hidden="true" />
      <input
        type="text"
        className="ua-cp-rx-point__text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="ua-cp-rx-point__remove" onClick={onRemove} aria-label="Remove point">×</button>
    </div>
  );
}

function ProtocolCard({ section, onUpdate, onRemove }) {
  const pointCount = section.points.length;

  function updatePoint(index, value) {
    const points = [...section.points];
    points[index] = value;
    onUpdate({ ...section, points });
  }

  function removePoint(index) {
    onUpdate({ ...section, points: section.points.filter((_, i) => i !== index) });
  }

  function addPoint() {
    onUpdate({ ...section, points: [...section.points, "New instruction"] });
  }

  return (
    <div className="ua-cp-rx-card">
      <div className="ua-cp-rx-card__head">
        <div className="ua-cp-rx-card__head-left">
          <span className="ua-cp-rx-card__dot" aria-hidden="true" />
          <input
            type="text"
            className="ua-cp-rx-card__title"
            value={section.title}
            onChange={(e) => onUpdate({ ...section, title: e.target.value })}
          />
        </div>
        <div className="ua-cp-rx-card__head-right">
          <span className="ua-cp-rx-card__count">{pointCount} points</span>
          <button type="button" className="ua-cp-rx-card__remove" onClick={onRemove} aria-label={`Remove ${section.title}`}>×</button>
        </div>
      </div>
      <div className="ua-cp-rx-card__body">
        {section.points.map((point, index) => (
          <ProtocolPointRow
            key={`${section.id}-${index}`}
            value={point}
            onChange={(next) => updatePoint(index, next)}
            onRemove={() => removePoint(index)}
          />
        ))}
        <button type="button" className="ua-cp-rx-add-point" onClick={addPoint}>+ Add point</button>
      </div>
    </div>
  );
}

function HistoryDetail({ sections }) {
  return (
    <div className="ua-cp-rx-history-detail">
      {sections.map((section) => (
        <div key={section.id} className="ua-cp-rx-history-detail__block">
          <div className="ua-cp-rx-history-detail__head">
            <span className="ua-cp-rx-card__dot" aria-hidden="true" />
            <strong>{section.title}</strong>
          </div>
          <ul className="ua-cp-rx-history-detail__list">
            {section.points.map((point, index) => (
              <li key={`${section.id}-${index}`}>{point}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function HistoryRow({ entry, expanded, onToggle, onRestore }) {
  return (
    <div className={`ua-cp-rx-history__item${expanded ? " ua-cp-rx-history__item--open" : ""}`}>
      <div className="ua-cp-rx-history__row">
        <span className="ua-cp-rx-history__date">{entry.dateLabel}</span>
        <div className="ua-cp-rx-history__badges">
          {entry.status === "current" ? (
            <span className="ua-cp-rx-badge ua-cp-rx-badge--current">CURRENT</span>
          ) : (
            <span className="ua-cp-rx-badge ua-cp-rx-badge--replaced">REPLACED</span>
          )}
          {entry.unsaved ? <span className="ua-cp-rx-badge ua-cp-rx-badge--unsaved">UNSAVED</span> : null}
        </div>
        <span className="ua-cp-rx-history__title">{entry.title}</span>
        <span className="ua-cp-rx-history__meta">{entry.points} points · by {entry.author}</span>
        <div className="ua-cp-rx-history__actions">
          <button type="button" className="ua-cp-rx-btn ua-cp-rx-btn--view" onClick={onToggle}>
            {expanded ? "Hide" : "View"}
          </button>
          {entry.canRestore ? (
            <button type="button" className="ua-cp-rx-btn ua-cp-rx-btn--restore" onClick={onRestore}>Restore</button>
          ) : (
            <span className="ua-cp-rx-history__action-spacer" aria-hidden="true" />
          )}
        </div>
      </div>
      {expanded ? <HistoryDetail sections={entry.sections} /> : null}
    </div>
  );
}

export function PrescriptionSection({ onToast }) {
  const [sections, setSections] = useState(PRESCRIPTION_SECTIONS);
  const [customTitle, setCustomTitle] = useState("");
  const [poolOpen, setPoolOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const poolRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (poolRef.current && !poolRef.current.contains(event.target)) {
        setPoolOpen(false);
      }
    }
    if (poolOpen) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [poolOpen]);

  function addFromPool(protocol) {
    setSections((list) => [
      ...list,
      {
        id: `${protocol.id}-${Date.now()}`,
        title: protocol.title,
        points: [...protocol.points],
      },
    ]);
    setPoolOpen(false);
    onToast?.(`Added ${protocol.title}`);
  }

  function addCustomProtocol() {
    const title = customTitle.trim();
    if (!title) return;
    setSections((list) => [
      ...list,
      { id: `custom-${Date.now()}`, title, points: ["New instruction"] },
    ]);
    setCustomTitle("");
    onToast?.(`Added ${title}`);
  }

  function updateSection(id, next) {
    setSections((list) => list.map((s) => (s.id === id ? next : s)));
  }

  function removeSection(id) {
    setSections((list) => list.filter((s) => s.id !== id));
  }

  function restoreHistory(entry) {
    setSections(entry.sections.map((s) => ({ ...s, id: `${s.id}-${Date.now()}` })));
    onToast?.(`Restored ${entry.title}`);
  }

  const history = PRESCRIPTION_HISTORY.map((entry, index) => (
    index === 0
      ? { ...entry, title: sectionsSummary(sections), points: totalPoints(sections), sections }
      : entry
  ));

  return (
    <div className="ua-cp-section ua-cp-rx">
      <div className="ua-cp-rx__head">
        <h2 className="ua-cp-rx__title">Wellness prescription</h2>
        <p className="ua-cp-rx__sub">Protocol sections of pointer instructions. Add from the pool, edit or delete any point.</p>
      </div>

      <div className="ua-cp-rx-toolbar">
        <div className="ua-cp-rx-pool" ref={poolRef}>
          <button
            type="button"
            className={`ua-cp-rx-pool__trigger${poolOpen ? " ua-cp-rx-pool__trigger--open" : ""}`}
            onClick={() => setPoolOpen((open) => !open)}
            aria-expanded={poolOpen}
            aria-haspopup="listbox"
          >
            + Add protocol from pool…
            <span className="ua-cp-rx-pool__chev" aria-hidden="true">▾</span>
          </button>
          {poolOpen ? (
            <ul className="ua-cp-rx-pool__menu" role="listbox">
              {PROTOCOL_POOL.map((protocol) => (
                <li key={protocol.id}>
                  <button type="button" className="ua-cp-rx-pool__option" onClick={() => addFromPool(protocol)}>
                    {protocol.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <input
          type="text"
          className="ua-cp-rx-toolbar__input"
          placeholder="Add your own protocol…"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addCustomProtocol(); }}
        />
        <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-rx-toolbar__add" onClick={addCustomProtocol}>Add</button>
      </div>

      <div className="ua-cp-rx-cards">
        {sections.map((section) => (
          <ProtocolCard
            key={section.id}
            section={section}
            onUpdate={(next) => updateSection(section.id, next)}
            onRemove={() => removeSection(section.id)}
          />
        ))}
      </div>

      <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-rx-save" onClick={() => onToast?.("Prescription saved and synced to app")}>
        Save &amp; sync to user app
      </button>

      <div className="ua-cp-rx-history">
        <h3 className="ua-cp-rx-history__heading">Prescription history</h3>
        <p className="ua-cp-rx-history__intro">
          Every protocol recommended to this client, newest first. Open one to see the exact points, or restore it into the editor.
        </p>
        <div className="ua-cp-rx-history__list">
          {history.map((entry) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              expanded={expandedHistoryId === entry.id}
              onToggle={() => setExpandedHistoryId((id) => (id === entry.id ? null : entry.id))}
              onRestore={() => restoreHistory(entry)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
