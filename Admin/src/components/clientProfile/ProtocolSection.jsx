import { useMemo, useState } from "react";
import {
  PROTOCOL_ONBOARDING_STEP,
  formatProtocolSavedAt,
  historyDeltaLabel,
  pointCountLabel,
} from "../../data/protocolSettingsData.js";

function pointsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function HistoryVersionCard({ entry, expanded, onToggle, onRestore }) {
  return (
    <div className={`ua-cp-proto-ver${expanded ? " ua-cp-proto-ver--open" : ""}`}>
      <button type="button" className="ua-cp-proto-ver__head" onClick={onToggle} aria-expanded={expanded}>
        <span className="ua-cp-proto-ver__badge">v{entry.version}</span>
        <div className="ua-cp-proto-ver__copy">
          <strong>{pointCountLabel(entry.points.length)} · {entry.savedAt}</strong>
          <span>Saved by Admin desk · {entry.deltaLabel}</span>
        </div>
        <span className={`ua-cp-proto-ver__chev${expanded ? " ua-cp-proto-ver__chev--open" : ""}`} aria-hidden="true">›</span>
      </button>
      {expanded ? (
        <div className="ua-cp-proto-ver__body">
          <ol className="ua-cp-proto-ver__list">
            {entry.points.map((point, index) => (
              <li key={`${entry.version}-${index}`}>
                <span className="ua-cp-proto-ver__list-num">{index + 1}</span>
                <span>{point}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="ua-cp-btn ua-cp-proto-ver__restore" onClick={onRestore}>
            Restore into working protocol
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ProtocolSection({ user, onToast }) {
  const [workingPoints, setWorkingPoints] = useState([]);
  const [savedPoints, setSavedPoints] = useState([]);
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState("");
  const [expandedVersion, setExpandedVersion] = useState(null);

  const clientName = user?.name?.split(" ")[0] || "Client";
  const dirty = !pointsEqual(workingPoints, savedPoints);
  const latestVersion = history[0]?.version ?? null;
  const canSave = dirty && workingPoints.some((point) => point.trim());

  const workingMeta = useMemo(() => {
    const count = workingPoints.length;
    if (!count && !latestVersion) return "No points yet. Add the first one below.";
    if (dirty) return `${pointCountLabel(count)} · unsaved changes`;
    if (latestVersion) return `${pointCountLabel(count)} · saved as v${latestVersion}`;
    return pointCountLabel(count);
  }, [workingPoints.length, dirty, latestVersion]);

  const pageSub = latestVersion
    ? `Step ${PROTOCOL_ONBOARDING_STEP} of onboarding · saved as v${latestVersion}.`
    : `Step ${PROTOCOL_ONBOARDING_STEP} of onboarding. Not set yet.`;

  function updatePoint(index, value) {
    setWorkingPoints((list) => list.map((point, i) => (i === index ? value : point)));
  }

  function removePoint(index) {
    setWorkingPoints((list) => list.filter((_, i) => i !== index));
  }

  function addPoint() {
    const text = draft.trim();
    if (!text) return;
    setWorkingPoints((list) => [...list, text]);
    setDraft("");
  }

  function discardChanges() {
    setWorkingPoints([...savedPoints]);
    onToast?.("Changes discarded");
  }

  function saveVersion() {
    const points = workingPoints.map((point) => point.trim()).filter(Boolean);
    if (!points.length) return;

    const previousCount = history[0]?.points.length ?? 0;
    const entry = {
      version: (history[0]?.version ?? 0) + 1,
      points,
      savedAt: formatProtocolSavedAt(),
      deltaLabel: historyDeltaLabel(points.length, previousCount),
    };

    setHistory((list) => [entry, ...list]);
    setWorkingPoints(points);
    setSavedPoints(points);
    setExpandedVersion(entry.version);
    onToast?.(`Protocol saved as v${entry.version}`);
  }

  function restoreVersion(entry) {
    setWorkingPoints([...entry.points]);
    onToast?.(`Restored v${entry.version} into working protocol`);
  }

  return (
    <div className="ua-cp-section ua-cp-proto">
      <div className="ua-cp-proto__head">
        <h2 className="ua-cp-proto__title">Protocol settings</h2>
        <p className="ua-cp-proto__sub">{pageSub}</p>
      </div>

      <div className="ua-cp-proto-panel">
        <div className="ua-cp-proto-work__head">
          <div className="ua-cp-proto-work__copy">
            <strong>Working protocol</strong>
            <p>Write the points you are planning for {clientName}</p>
            <span className="ua-cp-proto-work__meta">{workingMeta}</span>
          </div>
          <div className="ua-cp-proto-work__actions">
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
              disabled={!dirty}
              onClick={discardChanges}
            >
              Discard changes
            </button>
            {canSave ? (
              <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" onClick={saveVersion}>
                Save version
              </button>
            ) : (
              <button type="button" className="ua-cp-btn ua-cp-btn--muted ua-cp-btn--sm" disabled>
                Saved
              </button>
            )}
          </div>
        </div>

        {workingPoints.length ? (
          <div className="ua-cp-proto-points">
            {workingPoints.map((point, index) => (
              <div key={`point-${index}`} className="ua-cp-proto-point">
                <span className="ua-cp-proto-point__num">{index + 1}</span>
                <input
                  type="text"
                  className="ua-cp-proto-point__text"
                  value={point}
                  onChange={(e) => updatePoint(index, e.target.value)}
                />
                <button type="button" className="ua-cp-proto-point__remove" onClick={() => removePoint(index)} aria-label="Remove point">×</button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="ua-cp-proto-add">
          <input
            type="text"
            className="ua-cp-proto-add__input"
            placeholder="Add a protocol point"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addPoint(); }}
          />
          <button
            type="button"
            className={`ua-cp-btn ua-cp-btn--sm${draft.trim() ? " ua-cp-btn--primary" : " ua-cp-btn--muted"}`}
            disabled={!draft.trim()}
            onClick={addPoint}
          >
            + Add point
          </button>
        </div>
      </div>

      <div className="ua-cp-proto-history">
        <div className="ua-cp-proto-history__head">
          <span className="ua-cp-proto-history__label">History · {history.length}</span>
          <span className="ua-cp-proto-history__note">Every save is kept, newest first</span>
        </div>
        {history.length ? (
          <div className="ua-cp-proto-history__list">
            {history.map((entry) => (
              <HistoryVersionCard
                key={entry.version}
                entry={entry}
                expanded={expandedVersion === entry.version}
                onToggle={() => setExpandedVersion((v) => (v === entry.version ? null : entry.version))}
                onRestore={() => restoreVersion(entry)}
              />
            ))}
          </div>
        ) : (
          <div className="ua-cp-proto-history__empty">
            Nothing saved yet. Save the working protocol to start the history.
          </div>
        )}
      </div>
    </div>
  );
}
