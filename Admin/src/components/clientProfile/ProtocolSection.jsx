import { useEffect, useMemo, useState } from "react";
import {
  PROTOCOL_ONBOARDING_STEP,
  pointCountLabel,
} from "../../data/protocolSettingsData.js";
import {
  fetchUserProtocolSettings,
  saveUserProtocolSettings,
} from "../../api/protocolSettingsApi.js";

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
          <span>Saved by {entry.savedByLabel} · {entry.deltaLabel}</span>
        </div>
        <span className={`ua-cp-proto-ver__chev${expanded ? " ua-cp-proto-ver__chev--open" : ""}`} aria-hidden="true">›</span>
      </button>
      {expanded ? (
        <div className="ua-cp-proto-ver__body">
          <ol className="ua-cp-proto-ver__list">
            {entry.points.map((point, index) => (
              <li key={`${entry.id}-${index}`}>
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
  const userId = String(user?.id || "").trim();
  const [workingPoints, setWorkingPoints] = useState([]);
  const [savedPoints, setSavedPoints] = useState([]);
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState("");
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const clientName = user?.name?.split(" ")[0] || "Client";
  const dirty = !pointsEqual(workingPoints, savedPoints);
  const latestVersion = history[0]?.version ?? null;
  const canSave = dirty && workingPoints.some((point) => point.trim()) && !saving && !loading;

  const workingMeta = useMemo(() => {
    const count = workingPoints.length;
    if (loading) return "Loading protocol…";
    if (!count && !latestVersion) return "No points yet. Add the first one below.";
    if (dirty) return `${pointCountLabel(count)} · unsaved changes`;
    if (latestVersion) return `${pointCountLabel(count)} · saved as v${latestVersion}`;
    return pointCountLabel(count);
  }, [workingPoints.length, dirty, latestVersion, loading]);

  const pageSub = latestVersion
    ? `Step ${PROTOCOL_ONBOARDING_STEP} of onboarding · saved as v${latestVersion}.`
    : `Step ${PROTOCOL_ONBOARDING_STEP} of onboarding. Not set yet.`;

  useEffect(() => {
    if (!userId) {
      setWorkingPoints([]);
      setSavedPoints([]);
      setHistory([]);
      setLoading(false);
      setLoadError("");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");

    fetchUserProtocolSettings(userId)
      .then((data) => {
        if (cancelled) return;
        const points = data?.current?.points || [];
        setWorkingPoints([...points]);
        setSavedPoints([...points]);
        setHistory(data?.history || []);
        setExpandedVersion(data?.current?.version ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load protocol settings");
        onToast?.(err?.message || "Failed to load protocol settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onToast, userId]);

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

  async function saveVersion() {
    const points = workingPoints.map((point) => point.trim()).filter(Boolean);
    if (!points.length || !userId || saving) return;

    setSaving(true);
    try {
      const data = await saveUserProtocolSettings(userId, points);
      const nextPoints = data?.current?.points || points;
      setHistory(data?.history || []);
      setWorkingPoints([...nextPoints]);
      setSavedPoints([...nextPoints]);
      setExpandedVersion(data?.current?.version ?? null);
      onToast?.(data?.current?.version
        ? `Protocol saved as v${data.current.version}`
        : "Protocol saved");
    } catch (err) {
      onToast?.(err?.message || "Could not save protocol");
    } finally {
      setSaving(false);
    }
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

      {loadError ? (
        <p className="ua-page-head__sub" style={{ color: "#b42318", margin: "0 0 16px" }}>{loadError}</p>
      ) : null}

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
              className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm colers"
              disabled={!dirty || saving || loading}
              onClick={discardChanges}
            >
              Discard changes
            </button>
            {canSave ? (
              <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm colored" onClick={saveVersion} disabled={saving}>
                {saving ? "Saving…" : "Save version"}
              </button>
            ) : (
              <button type="button" className="btncolorss ua-cp-btn ua-cp-btn--muted ua-cp-btn--sm" disabled>
                {saving ? "Saving…" : "Saved"}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="ua-page-head__sub" style={{ margin: "8px 0 0" }}>Loading protocol…</p>
        ) : null}

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
                  disabled={saving}
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
            disabled={loading || saving}
          />
          <button
            type="button"
            className={`ua-cp-btn ua-cp-btn--sm${draft.trim() ? " ua-cp-btn--primary btncolor" : " ua-cp-btn--muted btncolors"}`}
            disabled={!draft.trim() || loading || saving}
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
                key={entry.id}
                entry={entry}
                expanded={expandedVersion === entry.version}
                onToggle={() => setExpandedVersion((v) => (v === entry.version ? null : entry.version))}
                onRestore={() => restoreVersion(entry)}
              />
            ))}
          </div>
        ) : (
          <div className="ua-cp-proto-history__empty">
            {loading ? "Loading history…" : "Nothing saved yet. Save the working protocol to start the history."}
          </div>
        )}
      </div>
    </div>
  );
}
