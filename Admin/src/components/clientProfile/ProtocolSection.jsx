import { useEffect, useMemo, useState } from "react";
import {
  PROTOCOL_MAX_POINTS,
  PROTOCOL_MAX_POINT_LENGTH,
  PROTOCOL_ONBOARDING_STEP,
  pointCountLabel,
  sanitizeProtocolPoint,
  validateProtocolPoint,
  validateProtocolPoints,
} from "../../data/protocolSettingsData.js";
import {
  fetchUserProtocolSettings,
  saveUserProtocolSettings,
} from "../../api/protocolSettingsApi.js";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";

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
                <span className="ua-cp-proto-ver__list-text">{point}</span>
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
  const { canEdit, canCreate } = useClientSectionPermissions("protocol");
  const canWrite = canEdit || canCreate;
  const userId = String(user?.id || "").trim();
  const [workingPoints, setWorkingPoints] = useState([]);
  const [savedPoints, setSavedPoints] = useState([]);
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const [pointErrors, setPointErrors] = useState([]);
  const [formError, setFormError] = useState("");
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const clientName = user?.name?.split(" ")[0] || "Client";
  const dirty = !pointsEqual(workingPoints, savedPoints);
  const latestVersion = history[0]?.version ?? null;
  const atPointLimit = workingPoints.length >= PROTOCOL_MAX_POINTS;
  const draftValidation = validateProtocolPoint(draft, { required: false });
  const draftLiveError = draft.trim().length >= 2 ? draftValidation : "";
  const canAddDraft = Boolean(draft.trim()) && !draftValidation && !atPointLimit && !loading && !saving;
  const pointsValidation = useMemo(
    () => validateProtocolPoints(workingPoints),
    [workingPoints]
  );
  const canSave = dirty && pointsValidation.ok && !saving && !loading;

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
      setPointErrors([]);
      setFormError("");
      setDraftError("");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setPointErrors([]);
    setFormError("");
    setDraftError("");

    fetchUserProtocolSettings(userId)
      .then((data) => {
        if (cancelled) return;
        const points = (data?.current?.points || []).map((point) =>
          sanitizeProtocolPoint(point)
        );
        setWorkingPoints([...points]);
        setSavedPoints([...points]);
        setPointErrors(points.map((point) => validateProtocolPoint(point, { required: false })));
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
    const next = sanitizeProtocolPoint(value);
    setWorkingPoints((list) => list.map((point, i) => (i === index ? next : point)));
    setPointErrors((list) => {
      const nextErrors = [...list];
      nextErrors[index] = validateProtocolPoint(next);
      return nextErrors;
    });
    setFormError("");
  }

  function removePoint(index) {
    setWorkingPoints((list) => list.filter((_, i) => i !== index));
    setPointErrors((list) => list.filter((_, i) => i !== index));
    setFormError("");
  }

  function addPoint() {
    if (atPointLimit) {
      const message = `A protocol cannot have more than ${PROTOCOL_MAX_POINTS} points.`;
      setDraftError(message);
      onToast?.(message);
      return;
    }

    const text = sanitizeProtocolPoint(draft).trim();
    const error = validateProtocolPoint(text);
    if (error) {
      setDraftError(error);
      onToast?.(error);
      return;
    }

    setWorkingPoints((list) => [...list, text]);
    setPointErrors((list) => [...list, ""]);
    setDraft("");
    setDraftError("");
    setFormError("");
  }

  function discardChanges() {
    setWorkingPoints([...savedPoints]);
    setPointErrors([]);
    setFormError("");
    setDraftError("");
    onToast?.("Changes discarded");
  }

  async function saveVersion() {
    if (!userId || saving) return;

    const validation = validateProtocolPoints(workingPoints);
    if (!validation.ok) {
      setPointErrors(validation.errors || []);
      setFormError(validation.message);
      onToast?.(validation.message);
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const data = await saveUserProtocolSettings(userId, validation.points);
      const nextPoints = data?.current?.points || validation.points;
      setHistory(data?.history || []);
      setWorkingPoints([...nextPoints]);
      setSavedPoints([...nextPoints]);
      setPointErrors([]);
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
    const points = (entry.points || []).map((point) => sanitizeProtocolPoint(point));
    setWorkingPoints([...points]);
    setPointErrors([]);
    setFormError("");
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
            {canWrite ? (
              <>
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
                {saving ? "Saving…" : dirty ? "Fix to save" : "Saved"}
              </button>
            )}
              </>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className="ua-page-head__sub" style={{ margin: "8px 0 0" }}>Loading protocol…</p>
        ) : null}

        {formError ? (
          <p className="ua-cp-proto__error" role="alert">{formError}</p>
        ) : null}

        {workingPoints.length ? (
          <div className="ua-cp-proto-points">
            {workingPoints.map((point, index) => {
              const error = pointErrors[index] || "";
              return (
                <div key={`point-${index}`} className="ua-cp-proto-point-wrap">
                  <div className="ua-cp-proto-point">
                    <span className="ua-cp-proto-point__num">{index + 1}</span>
                    <input
                      type="text"
                      className={`ua-cp-proto-point__text${error ? " ua-cp-proto-point__text--error" : ""}`}
                      value={point}
                      maxLength={PROTOCOL_MAX_POINT_LENGTH}
                      onChange={(e) => updatePoint(index, e.target.value)}
                      disabled={saving || !canWrite}
                      aria-invalid={Boolean(error)}
                    />
                    {canWrite ? (
                      <button type="button" className="ua-cp-proto-point__remove" onClick={() => removePoint(index)} aria-label="Remove point">×</button>
                    ) : null}
                  </div>
                  {error ? <p className="ua-cp-proto__error ua-cp-proto__error--inline">{error}</p> : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {canWrite ? (
        <div className="ua-cp-proto-add-wrap">
          <div className="ua-cp-proto-add">
            <input
              type="text"
              className={`ua-cp-proto-add__input${(draftError || draftLiveError) ? " ua-cp-proto-add__input--error" : ""}`}
              placeholder="Add a protocol point"
              value={draft}
              maxLength={PROTOCOL_MAX_POINT_LENGTH}
              onChange={(e) => {
                setDraft(sanitizeProtocolPoint(e.target.value));
                setDraftError("");
              }}
              onKeyDown={(e) => { if (e.key === "Enter") addPoint(); }}
              disabled={loading || saving || atPointLimit}
              aria-invalid={Boolean(draftError || draftLiveError)}
            />
            <button
              type="button"
              className={`ua-cp-btn ua-cp-btn--sm${canAddDraft ? " ua-cp-btn--primary btncolor" : " ua-cp-btn--muted btncolors"}`}
              disabled={!canAddDraft}
              onClick={addPoint}
            >
              + Add point
            </button>
          </div>
          <div className="ua-cp-proto-add__meta">
            <span className={(draftError || draftLiveError) ? "ua-cp-proto__error" : "ua-cp-proto__hint"}>
              {draftError
                || draftLiveError
                || (atPointLimit
                  ? `Maximum of ${PROTOCOL_MAX_POINTS} points reached.`
                  : `Max ${PROTOCOL_MAX_POINT_LENGTH} characters · ${workingPoints.length}/${PROTOCOL_MAX_POINTS} points`)}
            </span>
            {draft.trim() ? (
              <span className="ua-cp-proto__hint">
                {draft.length}/{PROTOCOL_MAX_POINT_LENGTH}
              </span>
            ) : null}
          </div>
        </div>
        ) : null}
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
