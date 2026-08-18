import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import { formatLongDate } from "../../api/usersApi.js";
import {
  assignUserWellnessPrescription,
  listActiveWellnessPrescriptionPool,
  listUserWellnessPrescriptions,
} from "../../api/wellnessPrescriptionAssignmentApi.js";
import { sectionsSummary, totalPoints } from "../../data/prescriptionData.js";

function todayIsoDate() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function cloneSections(list = []) {
  return list.map((section, index) => ({
    id: section.id || `${section.prescriptionId || "custom"}-${index}`,
    catalogId: section.catalogId || null,
    prescriptionId: section.prescriptionId || null,
    title: String(section.title || "").trim(),
    points: [...(Array.isArray(section.points) ? section.points : [])],
  }));
}

function sectionsEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((section, index) => {
    const other = b[index];
    if (!other) return false;
    if (String(section.title || "") !== String(other.title || "")) return false;
    if (section.points.length !== other.points.length) return false;
    return section.points.every((point, pointIndex) => point === other.points[pointIndex]);
  });
}

function authorLabel(assignment, user) {
  const role = String(assignment?.createdByRole || "").toLowerCase();
  if (role === "admin") return "Admin";
  if (role === "assistant_wellness_coach") {
    return String(user?.awc || "").trim() || "Assistant coach";
  }
  return String(user?.coach || "").trim() || "Coach";
}

function assignmentToHistoryEntry(assignment, { current = false, unsaved = false, user, sections } = {}) {
  const nextSections = cloneSections(sections || assignment?.sections || []);
  const dateValue = assignment?.date || assignment?.createdAt || "";
  return {
    id: assignment?.id || "current-draft",
    date: dateValue,
    dateLabel: unsaved && current
      ? "Not saved yet"
      : formatLongDate(dateValue) || dateValue || "—",
    status: current ? "current" : "replaced",
    unsaved,
    title: sectionsSummary(nextSections) || "Wellness prescription",
    points: totalPoints(nextSections),
    author: authorLabel(assignment, user),
    sections: nextSections,
    canRestore: !current,
  };
}

function ProtocolPointRow({ value, onChange, onRemove, disabled }) {
  return (
    <div className="ua-cp-rx-point">
      <span className="ua-cp-rx-point__bullet" aria-hidden="true" />
      <input
        type="text"
        className="ua-cp-rx-point__text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="ua-cp-rx-point__remove" onClick={onRemove} aria-label="Remove point" disabled={disabled}>×</button>
    </div>
  );
}

function ProtocolCard({ section, onUpdate, onRemove, disabled }) {
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
            disabled={disabled}
            onChange={(e) => onUpdate({ ...section, title: e.target.value })}
          />
        </div>
        <div className="ua-cp-rx-card__head-right">
          <span className="ua-cp-rx-card__count">{pointCount} points</span>
          <button type="button" className="ua-cp-rx-card__remove" onClick={onRemove} aria-label={`Remove ${section.title}`} disabled={disabled}>×</button>
        </div>
      </div>
      <div className="ua-cp-rx-card__body">
        {section.points.map((point, index) => (
          <ProtocolPointRow
            key={`${section.id}-${index}`}
            value={point}
            disabled={disabled}
            onChange={(next) => updatePoint(index, next)}
            onRemove={() => removePoint(index)}
          />
        ))}
        {disabled ? null : (
          <button type="button" className="ua-cp-rx-add-point" onClick={addPoint}>+ Add point</button>
        )}
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

function HistoryRow({ entry, expanded, onToggle, onRestore, canRestore }) {
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
          {entry.canRestore && canRestore ? (
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

export function PrescriptionSection({ user, onToast }) {
  const userId = String(user?.id || "").trim();
  const isHealClient = String(user?.userTier || "").toLowerCase() === "heal" || user?.tier === "Seek to Heal";
  const { can } = useViewAs();
  const canWrite = can("console.diet.create");
  const poolRef = useRef(null);

  const [sections, setSections] = useState([]);
  const [savedSections, setSavedSections] = useState([]);
  const [pool, setPool] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [customTitle, setCustomTitle] = useState("");
  const [poolOpen, setPoolOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dirty = !sectionsEqual(sections, savedSections);
  const hasPoints = sections.some((section) => section.points.some((point) => String(point).trim()));
  const canSave = canWrite && isHealClient && dirty && hasPoints && !saving && !loading;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const catalogData = await listActiveWellnessPrescriptionPool({ limit: 200 });
      const nextPool = catalogData?.protocols || [];
      setPool(nextPool);

      if (!isHealClient) {
        setRecommended(null);
        setHistoryRows([]);
        setSections([]);
        setSavedSections([]);
        return;
      }

      const assignmentData = await listUserWellnessPrescriptions(userId, nextPool);
      const nextRecommended = assignmentData?.recommended || null;
      const nextHistory = assignmentData?.history || [];
      const nextSections = cloneSections(nextRecommended?.sections || []);
      setRecommended(nextRecommended);
      setHistoryRows(nextHistory);
      setSections(nextSections);
      setSavedSections(cloneSections(nextSections));
    } catch (err) {
      setError(err?.message || "Failed to load wellness prescriptions");
      onToast?.(err?.message || "Failed to load wellness prescriptions");
    } finally {
      setLoading(false);
    }
  }, [isHealClient, onToast, userId]);

  useEffect(() => {
    load();
  }, [load]);

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
        catalogId: protocol.id,
        prescriptionId: protocol.prescriptionId || null,
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
      { id: `custom-${Date.now()}`, catalogId: null, prescriptionId: null, title, points: ["New instruction"] },
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
    setSections(cloneSections(entry.sections).map((section) => ({
      ...section,
      id: `${section.id}-${Date.now()}`,
    })));
    onToast?.(`Restored ${entry.title}`);
  }

  async function handleSave() {
    const protocols = sections
      .map((section) => ({
        catalogId: section.catalogId || undefined,
        title: String(section.title || "").trim(),
        points: (section.points || []).map((point) => String(point || "").trim()).filter(Boolean),
      }))
      .filter((protocol) => protocol.points.length > 0);
    if (!protocols.length) {
      onToast?.("Add at least one instruction before saving");
      return;
    }
    setSaving(true);
    try {
      await assignUserWellnessPrescription(userId, {
        date: todayIsoDate(),
        protocols,
      });
      onToast?.("Prescription saved and synced to app");
      await load();
    } catch (err) {
      onToast?.(err?.message || "Could not save wellness prescription");
    } finally {
      setSaving(false);
    }
  }

  const history = useMemo(() => {
    const rows = [];
    if (recommended || dirty) {
      rows.push(assignmentToHistoryEntry(recommended, {
        current: true,
        unsaved: dirty,
        user,
        sections,
      }));
    }
    historyRows.forEach((assignment) => {
      rows.push(assignmentToHistoryEntry(assignment, { user }));
    });
    return rows;
  }, [dirty, historyRows, recommended, sections, user]);

  if (!userId) {
    return <p className="ua-page-head__sub">Client is required to load wellness prescriptions.</p>;
  }

  const editorDisabled = !canWrite || !isHealClient || saving || loading;

  return (
    <div className="ua-cp-section ua-cp-rx">
      <div className="ua-cp-rx__head">
        <h2 className="ua-cp-rx__title">Wellness prescription</h2>
        <p className="ua-cp-rx__sub">Protocol sections of pointer instructions. Add from the pool, edit or delete any point.</p>
      </div>

      {loading ? <p className="ua-page-head__sub">Loading wellness prescriptions…</p> : null}
      {error && !loading ? <p className="ua-page-head__sub" style={{ color: "#b42318" }}>{error}</p> : null}
      {!isHealClient && !loading ? (
        <p className="ua-page-head__sub">Wellness prescriptions can only be assigned to Heal (paid) clients.</p>
      ) : null}

      <div className="ua-cp-rx-toolbar">
        <div className="ua-cp-rx-pool" ref={poolRef}>
          <button
            type="button"
            className={`ua-cp-rx-pool__trigger${poolOpen ? " ua-cp-rx-pool__trigger--open" : ""}`}
            onClick={() => setPoolOpen((open) => !open)}
            aria-expanded={poolOpen}
            aria-haspopup="listbox"
            disabled={editorDisabled}
          >
            + Add protocol from pool…
            <span className="ua-cp-rx-pool__chev" aria-hidden="true">▾</span>
          </button>
          {poolOpen ? (
            <ul className="ua-cp-rx-pool__menu" role="listbox">
              {pool.length ? pool.map((protocol) => (
                <li key={protocol.id}>
                  <button type="button" className="ua-cp-rx-pool__option" onClick={() => addFromPool(protocol)}>
                    {protocol.title}
                  </button>
                </li>
              )) : (
                <li>
                  <span className="ua-cp-rx-pool__option">No live protocols in the bank</span>
                </li>
              )}
            </ul>
          ) : null}
        </div>
        <input
          type="text"
          className="ua-cp-rx-toolbar__input"
          placeholder="Add your own protocol…"
          value={customTitle}
          disabled={editorDisabled}
          onChange={(e) => setCustomTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addCustomProtocol(); }}
        />
        <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-rx-toolbar__add" onClick={addCustomProtocol} disabled={editorDisabled || !customTitle.trim()}>Add</button>
      </div>

      <div className="ua-cp-rx-cards">
        {!loading && !sections.length ? (
          <p className="ua-page-head__sub">No protocol sections yet. Add one from the pool or create your own.</p>
        ) : null}
        {sections.map((section) => (
          <ProtocolCard
            key={section.id}
            section={section}
            disabled={editorDisabled}
            onUpdate={(next) => updateSection(section.id, next)}
            onRemove={() => removeSection(section.id)}
          />
        ))}
      </div>

      <button
        type="button"
        className="ua-cp-btn ua-cp-btn--green ua-cp-rx-save"
        onClick={handleSave}
        disabled={!canSave}
      >
        {saving ? "Saving…" : "Save & sync to user app"}
      </button>

      <div className="ua-cp-rx-history">
        <h3 className="ua-cp-rx-history__heading">Prescription history</h3>
        <p className="ua-cp-rx-history__intro">
          Every protocol recommended to this client, newest first. Open one to see the exact points, or restore it into the editor.
        </p>
        <div className="ua-cp-rx-history__list">
          {!loading && !history.length ? (
            <p className="ua-page-head__sub">No prescriptions have been saved for this client yet.</p>
          ) : null}
          {history.map((entry) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              expanded={expandedHistoryId === entry.id}
              onToggle={() => setExpandedHistoryId((id) => (id === entry.id ? null : entry.id))}
              onRestore={() => restoreHistory(entry)}
              canRestore={canWrite && isHealClient && !saving}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
