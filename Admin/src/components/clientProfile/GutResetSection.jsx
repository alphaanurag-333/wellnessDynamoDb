import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GUT_RESET_PRESETS,
  formatGutDate,
  gutResetSummary,
} from "../../data/gutResetData.js";
import { fetchUserGutResets, saveUserGutReset } from "../../api/gutResetApi.js";
import { todayIsoDate } from "../../utils/adminDateLimits.js";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";

const EMPTY_DRAFT = {
  startDate: "",
  fruitVegDate: "",
  waterFastDate: "",
  points: [],
};

function PresetSelect({ value, onChange, disabled }) {
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
        disabled={disabled}
      >
        {value || "Load preset…"}
        <span className="ua-cp-gut-preset__chev" aria-hidden="true" />
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
        <button style={{color:"rgb(94, 106, 210)"}} type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onToggle}>
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
  const userId = String(user?.id || "").trim();
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [pointDraft, setPointDraft] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const summary = useMemo(() => gutResetSummary(history), [history]);
  const canSave = Boolean(draft.startDate && draft.points.length > 0 && !saving && !loading);

  const loadHistory = useCallback(async () => {
    if (!userId) {
      setHistory([]);
      setLoading(false);
      setLoadError("");
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const rows = await fetchUserGutResets(userId);
      setHistory(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setHistory([]);
      const message = err?.message || "Failed to load Load Preset history";
      setLoadError(message);
      onToast?.(message);
    } finally {
      setLoading(false);
    }
  }, [onToast, userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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

  function ensureStartDate(current) {
    return current.startDate ? current : { ...current, startDate: todayIsoDate() };
  }

  function addPoint() {
    const text = pointDraft.trim();
    if (!text) return;
    setDraft((current) => ensureStartDate({
      ...current,
      points: [...current.points, text],
    }));
    setPointDraft("");
  }

  function loadPreset(preset) {
    setDraft((current) => ensureStartDate({
      ...current,
      points: [...preset.points],
    }));
    onToast?.(`Loaded ${preset.label}`);
  }

  function clearDraft() {
    setDraft(EMPTY_DRAFT);
    setPointDraft("");
  }

  async function savePlan() {
    if (!canSave || !userId) return;

    setSaving(true);
    try {
      const rows = await saveUserGutReset(userId, {
        startDate: draft.startDate,
        fruitVegDate: draft.fruitVegDate,
        waterFastDate: draft.waterFastDate,
        points: draft.points.map((point) => point.trim()).filter(Boolean),
      });
      setHistory(Array.isArray(rows) ? rows : []);
      const newest = Array.isArray(rows) ? rows[0] : null;
      if (newest?.id) setExpandedId(newest.id);
      clearDraft();
      onToast?.("Gut reset plan saved");
    } catch (err) {
      onToast?.(err?.message || "Failed to save Load Preset plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ua-cp-section ua-cp-gut">
      <div className="ua-cp-gut__head">
        <h2 className="ua-cp-gut__title">Load Preset</h2>
        <p className="ua-cp-gut__sub">Plan the reset, set the three dates and save it to the client app.</p>
      </div>

      {loading ? (
        <p className="ua-page-head__sub" style={{ margin: "0 0 12px" }}>Loading Load Preset history…</p>
      ) : null}
      {loadError ? (
        <div className="ua-cp-proto__error" role="alert">
          <p>{loadError}</p>
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={loadHistory}>
            Retry
          </button>
        </div>
      ) : null}

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
            <p>Set the three dates and the points. Saving pushes the plan to the client&apos;s app.</p>
          </div>
          <span className={`ua-cp-gut-panel__badge${canSave ? " ua-cp-gut-panel__badge--ready" : ""}`}>
            {canSave ? "Ready to save" : "Draft"}
          </span>
        </div>

        {canWrite ? (
        <>
        <div className="ua-cp-gut-dates">
          <label className="ua-cp-gut-date">
            <span>Start date</span>
            <input type="date" data-allow-future="true" value={draft.startDate} disabled={saving || loading} onChange={(e) => setDraft((c) => ({ ...c, startDate: e.target.value }))} />
          </label>
          <label className="ua-cp-gut-date">
            <span>Fruit &amp; veggie date</span>
            <input type="date" data-allow-future="true" value={draft.fruitVegDate} disabled={saving || loading} onChange={(e) => setDraft((c) => ({ ...c, fruitVegDate: e.target.value }))} />
          </label>
          <label className="ua-cp-gut-date">
            <span>Water fasting date</span>
            <input type="date" data-allow-future="true" value={draft.waterFastDate} disabled={saving || loading} onChange={(e) => setDraft((c) => ({ ...c, waterFastDate: e.target.value }))} />
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
                  disabled={saving || loading}
                  onChange={(e) => updatePoint(index, e.target.value)}
                />
                <button type="button" className="ua-cp-gut-point__remove" disabled={saving || loading} onClick={() => removePoint(index)} aria-label="Remove point">×</button>
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
            disabled={saving || loading}
            onChange={(e) => setPointDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addPoint(); }}
          />
          <button
            type="button"
            className={`ua-cp-btn ua-cp-btn--sm ua-cp-gut-add__btn${pointDraft.trim() ? " ua-cp-btn--primary" : " ua-cp-btn--muted"}`}
            disabled={!pointDraft.trim() || saving || loading}
            onClick={addPoint}
          >
            + Add point
          </button>
          <PresetSelect value="" onChange={loadPreset} disabled={saving || loading} />
        </div>

        <div className="ua-cp-gut-panel__foot">
          <p>{canSave ? "The client gets the plan and all three dates in their app." : "Add a start date and at least one point to save."}</p>
          <div className="ua-cp-gut-panel__actions">
            <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" disabled={saving || loading} onClick={clearDraft}>Clear</button>
            <button
              type="button"
              className={`ua-cp-btn ua-cp-btn--sm${canSave ? " ua-cp-btn--primary" : " ua-cp-btn--muted"}`}
              disabled={!canSave}
              onClick={savePlan}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        </>
        ) : (
          <p className="ua-cp-placeholder__note">You do not have permission to create or edit Load Preset plans.</p>
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
