import { useEffect, useMemo, useRef, useState } from "react";
import {
  GUT_RESET_HISTORY,
  GUT_RESET_PRESETS,
  formatGutDate,
  gutResetSummary,
} from "../../data/gutResetData.js";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";

const EMPTY_DRAFT = {
  startDate: "",
  fruitVegDate: "",
  waterFastDate: "",
  points: [],
};

function PresetSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="ua-cp-gut-preset" ref={ref}>
      <button
        type="button"
        className={`ua-cp-gut-preset__trigger${open ? " ua-cp-gut-preset__trigger--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {value || "Load preset…"}
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <ul className="ua-cp-gut-preset__menu">
          {GUT_RESET_PRESETS.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                className="ua-cp-gut-preset__option"
                onClick={() => {
                  onChange(preset);
                  setOpen(false);
                }}
              >
                {preset.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TimelineCards({ entry }) {
  return (
    <div className="ua-cp-gut-timeline">
      <div className="ua-cp-gut-timeline__card ua-cp-gut-timeline__card--start">
        <span className="ua-cp-gut-timeline__dot" aria-hidden="true" />
        <div className="ua-cp-gut-timeline__copy">
          <span className="ua-cp-gut-timeline__label">Start</span>
          <strong>{formatGutDate(entry.startDate)}</strong>
        </div>
      </div>
      <div className="ua-cp-gut-timeline__card ua-cp-gut-timeline__card--fruit">
        <span className="ua-cp-gut-timeline__dot" aria-hidden="true" />
        <div className="ua-cp-gut-timeline__copy">
          <span className="ua-cp-gut-timeline__label">Fruit &amp; veggie</span>
          <strong>{formatGutDate(entry.fruitVegDate)}</strong>
        </div>
      </div>
      <div className="ua-cp-gut-timeline__card ua-cp-gut-timeline__card--water">
        <span className="ua-cp-gut-timeline__dot" aria-hidden="true" />
        <div className="ua-cp-gut-timeline__copy">
          <span className="ua-cp-gut-timeline__label">Water fasting</span>
          <strong>{formatGutDate(entry.waterFastDate)}</strong>
        </div>
      </div>
    </div>
  );
}

function HistoryResetCard({ entry, expanded, onToggle }) {
  const active = entry.status === "active";

  return (
    <div className={`ua-cp-gut-history${expanded ? " ua-cp-gut-history--open" : ""}`}>
      <div className="ua-cp-gut-history__head">
        <div className="ua-cp-gut-history__main">
          <span className={`ua-cp-gut-history__badge ua-cp-gut-history__badge--${entry.status}`}>
            {active ? "ACTIVE" : "COMPLETED"}
          </span>
          <strong>Reset · {formatGutDate(entry.startDate)}</strong>
          <span className="ua-cp-gut-history__by">by {entry.author}</span>
        </div>
        <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onToggle}>
          {expanded ? "Hide plan" : `View plan · ${entry.points.length}`}
        </button>
      </div>
      {expanded ? (
        <div className="ua-cp-gut-history__body">
          <TimelineCards entry={entry} />
          <ol className="ua-cp-gut-history__points">
            {entry.points.map((point, index) => (
              <li key={`${entry.id}-${index}`}>
                <span className="ua-cp-gut-history__point-num">{index + 1}</span>
                <span>{point}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

export function GutResetSection({ user, onToast }) {
  const { canCreate, canEdit } = useClientSectionPermissions("gut");
  const canWrite = canCreate || canEdit;
  const [history, setHistory] = useState(GUT_RESET_HISTORY);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [pointDraft, setPointDraft] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const summary = useMemo(() => gutResetSummary(history), [history]);
  const canTrigger = Boolean(draft.startDate && draft.points.length > 0);

  function updatePoint(index, value) {
    setDraft((current) => ({
      ...current,
      points: current.points.map((point, i) => (i === index ? value : point)),
    }));
  }

  function removePoint(index) {
    setDraft((current) => ({
      ...current,
      points: current.points.filter((_, i) => i !== index),
    }));
  }

  function addPoint() {
    const text = pointDraft.trim();
    if (!text) return;
    setDraft((current) => ({ ...current, points: [...current.points, text] }));
    setPointDraft("");
  }

  function loadPreset(preset) {
    setDraft((current) => ({ ...current, points: [...preset.points] }));
    onToast?.(`Loaded ${preset.label}`);
  }

  function clearDraft() {
    setDraft(EMPTY_DRAFT);
    setPointDraft("");
  }

  function triggerPlan() {
    if (!canTrigger) return;

    const entry = {
      id: `reset-${Date.now()}`,
      status: "active",
      startDate: draft.startDate,
      fruitVegDate: draft.fruitVegDate,
      waterFastDate: draft.waterFastDate,
      author: "Admin desk",
      points: draft.points.map((point) => point.trim()).filter(Boolean),
    };

    setHistory((list) => [
      entry,
      ...list.map((item) => (item.status === "active" ? { ...item, status: "completed" } : item)),
    ]);
    setExpandedId(entry.id);
    clearDraft();
    onToast?.("Gut reset plan triggered to app");
  }

  return (
    <div className="ua-cp-section ua-cp-gut">
      <div className="ua-cp-gut__head">
        <h2 className="ua-cp-gut__title">Gut reset</h2>
        <p className="ua-cp-gut__sub">Plan the reset, set the three dates and trigger it to the client app.</p>
      </div>

      <div className="ua-cp-gut-stats">
        <div className="ua-cp-gut-stat">
          <span className="ua-cp-gut-stat__label">Resets done</span>
          <strong>{summary.resetsDone}</strong>
          <span className="ua-cp-gut-stat__foot">across the programme</span>
        </div>
        <div className="ua-cp-gut-stat">
          <span className="ua-cp-gut-stat__label">Last start</span>
          <strong>{summary.lastStart}</strong>
          <span className="ua-cp-gut-stat__foot">by {summary.lastStartBy}</span>
        </div>
        <div className="ua-cp-gut-stat">
          <span className="ua-cp-gut-stat__label">Last fruit &amp; veggie</span>
          <strong>{summary.lastFruitVeg}</strong>
          <span className="ua-cp-gut-stat__foot">no cooked food</span>
        </div>
        <div className="ua-cp-gut-stat">
          <span className="ua-cp-gut-stat__label">Last water fasting</span>
          <strong>{summary.lastWaterFast}</strong>
          <span className="ua-cp-gut-stat__foot">24 hours</span>
        </div>
      </div>

      <div className="ua-cp-gut-panel">
        <div className="ua-cp-gut-panel__head">
          <div>
            <strong>Plan a reset</strong>
            <p>Set the three dates and the points. Triggering it pushes the plan to the client&apos;s app.</p>
          </div>
          <span className={`ua-cp-gut-panel__badge${canTrigger ? " ua-cp-gut-panel__badge--ready" : ""}`}>
            {canTrigger ? "Ready to trigger" : "Draft"}
          </span>
        </div>

        {canWrite ? (
        <>
        <div className="ua-cp-gut-dates">
          <label className="ua-cp-gut-date">
            <span>Start date</span>
            <input type="date" value={draft.startDate} onChange={(e) => setDraft((c) => ({ ...c, startDate: e.target.value }))} />
          </label>
          <label className="ua-cp-gut-date">
            <span>Fruit &amp; veggie date</span>
            <input type="date" value={draft.fruitVegDate} onChange={(e) => setDraft((c) => ({ ...c, fruitVegDate: e.target.value }))} />
          </label>
          <label className="ua-cp-gut-date">
            <span>Water fasting date</span>
            <input type="date" value={draft.waterFastDate} onChange={(e) => setDraft((c) => ({ ...c, waterFastDate: e.target.value }))} />
          </label>
        </div>

        <div className="ua-cp-gut-points-head">
          <span className="ua-cp-gut-points-head__label">Plan points</span>
          <span className="ua-cp-gut-points-head__meta">
            {draft.points.length
              ? `${draft.points.length} point${draft.points.length === 1 ? "" : "s"} in draft`
              : "No points yet. Add the first one below, or load a preset."}
          </span>
        </div>

        {draft.points.length ? (
          <div className="ua-cp-gut-points">
            {draft.points.map((point, index) => (
              <div key={`draft-point-${index}`} className="ua-cp-gut-point">
                <span className="ua-cp-gut-point__num">{index + 1}</span>
                <input
                  type="text"
                  className="ua-cp-gut-point__text"
                  value={point}
                  onChange={(e) => updatePoint(index, e.target.value)}
                />
                <button type="button" className="ua-cp-gut-point__remove" onClick={() => removePoint(index)} aria-label="Remove point">×</button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="ua-cp-gut-add">
          <input
            type="text"
            className="ua-cp-gut-add__input"
            placeholder="Add a plan point and press Enter"
            value={pointDraft}
            onChange={(e) => setPointDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addPoint(); }}
          />
          <button
            type="button"
            className={`ua-cp-btn ua-cp-btn--sm${pointDraft.trim() ? " ua-cp-btn--primary" : " ua-cp-btn--muted"}`}
            disabled={!pointDraft.trim()}
            onClick={addPoint}
          >
            + Add point
          </button>
          <PresetSelect value="" onChange={loadPreset} />
        </div>

        <div className="ua-cp-gut-panel__foot">
          <p>{canTrigger ? "The client gets the plan and all three dates in their app." : "Add a start date and at least one point to trigger."}</p>
          <div className="ua-cp-gut-panel__actions">
            <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={clearDraft}>Clear</button>
            <button
              type="button"
              className={`ua-cp-btn ua-cp-btn--sm${canTrigger ? " ua-cp-btn--primary" : " ua-cp-btn--muted"}`}
              disabled={!canTrigger}
              onClick={triggerPlan}
            >
              Trigger to user app
            </button>
          </div>
        </div>
        </>
        ) : (
          <p className="ua-cp-placeholder__note">You do not have permission to create or edit gut reset plans.</p>
        )}
      </div>

      <div className="ua-cp-gut-history-wrap">
        <div className="ua-cp-gut-history-wrap__head">
          <span className="ua-cp-gut-history-wrap__label">History · {history.length}</span>
          <span className="ua-cp-gut-history-wrap__note">Newest first</span>
        </div>
        <div className="ua-cp-gut-history-wrap__list">
          {history.map((entry) => (
            <HistoryResetCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId((id) => (id === entry.id ? null : entry.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
