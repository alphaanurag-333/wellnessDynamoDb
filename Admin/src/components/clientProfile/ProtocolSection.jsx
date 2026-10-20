import { useEffect, useRef, useState } from "react";
import {
  PROTOCOL_MAX_POINTS,
  PROTOCOL_MAX_SECTIONS,
  PROTOCOL_ONBOARDING_STEP,
  newProtocolSectionId,
  sanitizeProtocolPoint,
  validateProtocolHeading,
  validateProtocolPoint,
  validateProtocolSections,
} from "../../data/protocolSettingsData.js";
import {
  deleteUserProtocolSettings,
  fetchUserProtocolSettings,
  saveUserProtocolSettings,
  updateUserProtocolSettings,
} from "../../api/protocolSettingsApi.js";
import { ConfirmDialog } from "../ConfirmDialog.jsx";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";

function sectionsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function cloneSections(sections) {
  return (Array.isArray(sections) ? sections : []).map((section) => ({
    id: String(section?.id || newProtocolSectionId()),
    heading: String(section?.heading || ""),
    points: (Array.isArray(section?.points) ? section.points : []).map((point) => sanitizeProtocolPoint(point)),
  }));
}

function sectionsFromEntry(entry) {
  const source = entry?.sections?.length
    ? entry.sections
    : [{ id: entry?.id, heading: "Protocol", points: entry?.points || [] }];
  return cloneSections(source);
}

function HistoryVersionCard({ entry, onSave, onDeleteSavedSection, canEdit, saving }) {
  const sections = sectionsFromEntry(entry);

  return (
    <div className="ua-cp-proto-ver ua-cp-proto-ver--open">
      {canEdit ? (
          <SavedProtocolEditor
            entry={entry}
            saving={saving}
            onSave={onSave}
            onDeleteSavedSection={onDeleteSavedSection}
          />
        ) : (
          <div className="ua-cp-proto-ver__body">
            {sections.map((section) => (
              <div key={section.id} className="ua-cp-proto-ver__section">
                <p className="ua-cp-proto-ver__heading">{section.heading || "Untitled section"}</p>
                <ol className="ua-cp-proto-ver__list">
                  {section.points.map((point, index) => (
                    <li key={`${section.id}-${index}`}>
                      <span className="ua-cp-proto-ver__list-num">{index + 1}</span>
                      <span className="ua-cp-proto-ver__list-text">{point}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
      )}
    </div>
  );
}

function moveListItem(list, fromIndex, toIndex) {
  if (
    fromIndex === toIndex
    || fromIndex < 0
    || toIndex < 0
    || fromIndex >= list.length
    || toIndex >= list.length
  ) return list;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function SavedProtocolEditor({ entry, saving, onSave, onDeleteSavedSection }) {
  const initialKey = JSON.stringify(sectionsFromEntry(entry));
  const [sections, setSections] = useState(() => sectionsFromEntry(entry));
  const [headingErrors, setHeadingErrors] = useState({});
  const [pointErrors, setPointErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pendingDeleteSection, setPendingDeleteSection] = useState(null);

  useEffect(() => {
    setSections(sectionsFromEntry(entry));
    setHeadingErrors({});
    setPointErrors({});
    setFormError("");
    setPendingDeleteSection(null);
  }, [entry.id, initialKey]);

  const dirty = !sectionsEqual(sections, sectionsFromEntry(entry));

  function updateHeading(sectionId, value) {
    const heading = String(value ?? "");
    setSections((list) => list.map((section) => (
      section.id === sectionId ? { ...section, heading } : section
    )));
    setHeadingErrors((current) => ({
      ...current,
      [sectionId]: validateProtocolHeading(heading, { required: Boolean(heading.trim()) }),
    }));
    setFormError("");
  }

  function updatePoint(sectionId, pointIndex, value) {
    const next = sanitizeProtocolPoint(value);
    setSections((list) => list.map((section) => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        points: section.points.map((point, index) => (index === pointIndex ? next : point)),
      };
    }));
    setPointErrors((current) => {
      const nextErrors = [...(current[sectionId] || [])];
      nextErrors[pointIndex] = String(next).trim() ? validateProtocolPoint(next) : "";
      return { ...current, [sectionId]: nextErrors };
    });
    setFormError("");
  }

  function removePoint(sectionId, pointIndex) {
    setSections((list) => list.map((section) => {
      if (section.id !== sectionId) return section;
      return { ...section, points: section.points.filter((_, index) => index !== pointIndex) };
    }));
    setPointErrors((current) => ({
      ...current,
      [sectionId]: (current[sectionId] || []).filter((_, index) => index !== pointIndex),
    }));
    setFormError("");
  }

  function addPoint(sectionId) {
    const section = sections.find((item) => item.id === sectionId);
    if (!section || section.points.length >= PROTOCOL_MAX_POINTS) return;
    setSections((list) => list.map((item) => (
      item.id === sectionId ? { ...item, points: [...item.points, ""] } : item
    )));
    setFormError("");
  }

  function movePoint(sectionId, fromIndex, toIndex) {
    setSections((list) => list.map((section) => (
      section.id === sectionId
        ? { ...section, points: moveListItem(section.points, fromIndex, toIndex) }
        : section
    )));
    setPointErrors((current) => ({
      ...current,
      [sectionId]: moveListItem(current[sectionId] || [], fromIndex, toIndex),
    }));
    setFormError("");
  }

  async function confirmDeleteSection() {
    const section = pendingDeleteSection;
    if (!section) return;
    const previous = sections;
    const remaining = sections.filter((item) => item.id !== section.id);
    setPendingDeleteSection(null);
    setSections(remaining);
    setFormError("");
    try {
      await onDeleteSavedSection(remaining);
    } catch {
      setSections(previous);
    }
  }

  function discard() {
    setSections(sectionsFromEntry(entry));
    setHeadingErrors({});
    setPointErrors({});
    setFormError("");
  }

  async function save() {
    const validation = validateProtocolSections(sections);
    if (!validation.ok) {
      const nextHeadingErrors = {};
      const nextPointErrors = {};
      sections.forEach((section, index) => {
        const item = validation.errors?.[index];
        if (!item) return;
        nextHeadingErrors[section.id] = item.heading || "";
        nextPointErrors[section.id] = item.points || [];
      });
      setHeadingErrors(nextHeadingErrors);
      setPointErrors(nextPointErrors);
      setFormError(validation.message);
      return;
    }
    try {
      await onSave(validation.sections);
    } catch {
      // The parent reports the save error.
    }
  }

  return (
    <div className="ua-cp-proto-ver__body">
      {formError ? <p className="ua-cp-proto__error" role="alert">{formError}</p> : null}
      <SectionsBoard
        sections={sections}
        canWrite
        saving={saving}
        headingErrors={headingErrors}
        pointErrors={pointErrors}
        onHeadingChange={updateHeading}
        onPointChange={updatePoint}
        onRemovePoint={removePoint}
        onAddPoint={addPoint}
        onMovePoint={movePoint}
        onDeleteSection={setPendingDeleteSection}
        showAddSection={false}
      />
      <div className="ua-cp-proto-ver__actions">
        <button
          type="button"
          className={`ua-cp-btn ua-cp-btn--sm${dirty && !saving ? " ua-cp-btn--green colored" : " ua-cp-btn--muted btncolorss"}`}
          disabled={!dirty || saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm colers"
          disabled={!dirty || saving}
          onClick={discard}
        >
          Discard
        </button>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDeleteSection)}
        tag="Delete section"
        title={pendingDeleteSection?.heading ? `Delete ${pendingDeleteSection.heading}?` : "Delete this section?"}
        body="This deletes the section from the saved protocol."
        cancelLabel="Keep section"
        confirmLabel="Delete section"
        confirmTone="danger"
        onCancel={() => setPendingDeleteSection(null)}
        onConfirm={confirmDeleteSection}
      />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.25v11.5M1.25 7h11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true">
      {[2, 8, 14].map((y) => (
        <g key={y}>
          <circle cx="3" cy={y} r="1.15" fill="currentColor" />
          <circle cx="9" cy={y} r="1.15" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20.2l4.1-1L19.2 8.1a1.7 1.7 0 0 0 0-2.4l-.9-.9a1.7 1.7 0 0 0-2.4 0L4.8 15.9 4 20.2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.8 6.2l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 7h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 7V5.4A1.4 1.4 0 0 1 10.4 4h3.2A1.4 1.4 0 0 1 15 5.4V7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.6 7.2l.7 12.1a1.4 1.4 0 0 0 1.4 1.3h4.6a1.4 1.4 0 0 0 1.4-1.3l.7-12.1" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.2 10.2L8 5.4l4.8 4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProtocolSectionCard({
  section,
  index,
  canWrite,
  saving,
  headingError,
  pointErrors,
  onHeadingChange,
  onPointChange,
  onRemovePoint,
  onAddPoint,
  onMovePoint,
  onDelete,
}) {
  const headingRef = useRef(null);
  const pointRefs = useRef([]);
  const focusNewPoint = useRef(false);
  const [open, setOpen] = useState(true);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const atPointLimit = section.points.length >= PROTOCOL_MAX_POINTS;

  useEffect(() => {
    if (!focusNewPoint.current) return;
    focusNewPoint.current = false;
    pointRefs.current[section.points.length - 1]?.focus();
  }, [section.points.length]);

  function focusHeading() {
    setOpen(true);
    window.setTimeout(() => headingRef.current?.focus(), 0);
  }

  function addPoint() {
    if (atPointLimit || saving) return;
    focusNewPoint.current = true;
    setOpen(true);
    onAddPoint();
  }

  return (
    <article className="ua-cp-proto-section">
      <div className="ua-cp-proto-section__head">
        <input
          ref={headingRef}
          type="text"
          className={`ua-cp-proto-section__heading${headingError ? " ua-cp-proto-point__text--error" : ""}`}
          value={section.heading}
          placeholder={`Section ${index + 1}`}
          disabled={saving || !canWrite}
          aria-label={`Section ${index + 1} heading`}
          aria-invalid={Boolean(headingError)}
          onChange={(event) => onHeadingChange(event.target.value)}
        />
        {canWrite ? (
          <button type="button" className="ua-cp-proto-icon-btn" onClick={focusHeading} disabled={saving}>
            <PencilIcon /> Edit
          </button>
        ) : null}
        {canWrite ? (
          <button type="button" className="ua-cp-proto-icon-btn ua-cp-proto-icon-btn--danger" onClick={onDelete} disabled={saving}>
            <TrashIcon /> Delete
          </button>
        ) : null}
        <button
          type="button"
          className={`ua-cp-proto-section__chev${open ? "" : " ua-cp-proto-section__chev--closed"}`}
          aria-expanded={open}
          aria-label={open ? "Collapse section" : "Expand section"}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronIcon />
        </button>
      </div>
      {headingError ? <p className="ua-cp-proto__error ua-cp-proto__error--inline">{headingError}</p> : null}

      {open ? (
        <>
          {section.points.length ? (
            <div className="ua-cp-proto-points">
              {section.points.map((point, pointIndex) => {
                const error = pointErrors[pointIndex] || "";
                return (
                  <div key={`${section.id}-point-${pointIndex}`} className="ua-cp-proto-point-wrap">
                    <div
                      className={`ua-cp-proto-point${overIndex === pointIndex ? " ua-cp-proto-point--over" : ""}`}
                      onDragOver={(event) => {
                        if (dragIndex === null || !canWrite) return;
                        event.preventDefault();
                        if (overIndex !== pointIndex) setOverIndex(pointIndex);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const from = Number(event.dataTransfer.getData("text/plain"));
                        if (!Number.isNaN(from)) onMovePoint(from, pointIndex);
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                    >
                      {canWrite ? (
                        <span
                          className="ua-cp-proto-point__grip"
                          draggable={!saving}
                          aria-label="Drag to reorder"
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", String(pointIndex));
                            setDragIndex(pointIndex);
                          }}
                          onDragEnd={() => {
                            setDragIndex(null);
                            setOverIndex(null);
                          }}
                        >
                          <GripIcon />
                        </span>
                      ) : null}
                      <input
                        ref={(node) => {
                          pointRefs.current[pointIndex] = node;
                        }}
                        type="text"
                        className={`ua-cp-proto-point__text${error ? " ua-cp-proto-point__text--error" : ""}`}
                        value={point}
                        placeholder={`Point ${pointIndex + 1}`}
                        disabled={saving || !canWrite}
                        aria-label={`${section.heading || `Section ${index + 1}`} point ${pointIndex + 1}`}
                        aria-invalid={Boolean(error)}
                        onChange={(event) => onPointChange(pointIndex, event.target.value)}
                      />
                      {canWrite ? (
                        <button
                          type="button"
                          className="ua-cp-proto-icon-btn ua-cp-proto-icon-btn--quiet"
                          aria-label="Edit point"
                          disabled={saving}
                          onClick={() => pointRefs.current[pointIndex]?.focus()}
                        >
                          <PencilIcon />
                        </button>
                      ) : null}
                      {canWrite ? (
                        <button
                          type="button"
                          className="ua-cp-proto-icon-btn ua-cp-proto-icon-btn--quiet ua-cp-proto-icon-btn--danger"
                          aria-label="Delete point"
                          disabled={saving}
                          onClick={() => onRemovePoint(pointIndex)}
                        >
                          <TrashIcon />
                        </button>
                      ) : null}
                    </div>
                    {error ? <p className="ua-cp-proto__error ua-cp-proto__error--inline">{error}</p> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {canWrite ? (
            <button type="button" className="ua-cp-proto-add-point" disabled={saving || atPointLimit} onClick={addPoint}>
              <PlusIcon /> Add Point
            </button>
          ) : null}
          {atPointLimit ? <p className="ua-cp-proto-section__meta">Maximum of {PROTOCOL_MAX_POINTS} points reached.</p> : null}
        </>
      ) : null}
    </article>
  );
}

function SectionsBoard({
  sections,
  canWrite,
  saving,
  headingErrors,
  pointErrors,
  onHeadingChange,
  onPointChange,
  onRemovePoint,
  onAddPoint,
  onMovePoint,
  onDeleteSection,
  onAddSection,
  showAddSection = true,
}) {
  const atSectionLimit = sections.length >= PROTOCOL_MAX_SECTIONS;

  return (
    <div className="ua-cp-proto-board">
      {showAddSection ? (
        <div className="ua-cp-proto-board__bar">
          <h3>Sections</h3>
          {canWrite ? (
            <button type="button" className="ua-cp-proto-add-section" disabled={saving || atSectionLimit} onClick={onAddSection}>
              <PlusIcon /> Add Section
            </button>
          ) : null}
        </div>
      ) : null}
      {sections.length ? (
        <div className="ua-cp-proto-sections">
          {sections.map((section, index) => (
            <ProtocolSectionCard
              key={section.id}
              section={section}
              index={index}
              canWrite={canWrite}
              saving={saving}
              headingError={headingErrors[section.id] || ""}
              pointErrors={pointErrors[section.id] || []}
              onHeadingChange={(value) => onHeadingChange(section.id, value)}
              onPointChange={(pointIndex, value) => onPointChange(section.id, pointIndex, value)}
              onRemovePoint={(pointIndex) => onRemovePoint(section.id, pointIndex)}
              onAddPoint={() => onAddPoint(section.id)}
              onMovePoint={(fromIndex, toIndex) => onMovePoint(section.id, fromIndex, toIndex)}
              onDelete={() => onDeleteSection(section)}
            />
          ))}
        </div>
      ) : showAddSection ? (
        <p className="ua-cp-proto-board__empty">No sections yet. Add a section, then write the points inside it.</p>
      ) : null}
      {canWrite && showAddSection ? (
        <button
          type="button"
          className="ua-cp-proto-add-section ua-cp-proto-add-section--dashed"
          disabled={saving || atSectionLimit}
          onClick={onAddSection}
        >
          <PlusIcon /> Add Section
        </button>
      ) : null}
    </div>
  );
}

export function ProtocolSection({ user, onToast }) {
  const { canEdit, canCreate } = useClientSectionPermissions("protocol");
  const canWrite = canEdit || canCreate;
  const userId = String(user?.id || "").trim();
  const [workingSections, setWorkingSections] = useState([]);
  const [savedSections, setSavedSections] = useState([]);
  const [history, setHistory] = useState([]);
  const [headingErrors, setHeadingErrors] = useState({});
  const [pointErrors, setPointErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [savingVersionId, setSavingVersionId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingDeleteSection, setPendingDeleteSection] = useState(null);
  const [loadError, setLoadError] = useState("");

  const dirty = !sectionsEqual(workingSections, savedSections);
  const latestVersion = history[0]?.version ?? null;
  const atSectionLimit = workingSections.length >= PROTOCOL_MAX_SECTIONS;
  const pageSub = latestVersion
    ? `Step ${PROTOCOL_ONBOARDING_STEP} of onboarding · saved as v${latestVersion}. Each section has a heading and up to ${PROTOCOL_MAX_POINTS} points.`
    : `Step ${PROTOCOL_ONBOARDING_STEP} of onboarding. Not set yet. Each section has a heading and up to ${PROTOCOL_MAX_POINTS} points.`;

  function applyLoadedSections(sections) {
    const next = cloneSections(sections);
    setWorkingSections(next);
    setSavedSections(cloneSections(next));
    setHeadingErrors({});
    setPointErrors({});
    setFormError("");
  }

  useEffect(() => {
    if (!userId) {
      setWorkingSections([]);
      setSavedSections([]);
      setHistory([]);
      setLoading(false);
      setLoadError("");
      setHeadingErrors({});
      setPointErrors({});
      setFormError("");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setHeadingErrors({});
    setPointErrors({});
    setFormError("");

    fetchUserProtocolSettings(userId)
      .then((data) => {
        if (cancelled) return;
        applyLoadedSections([]);
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

  function updateHeading(sectionId, value) {
    const heading = String(value ?? "");
    setWorkingSections((list) => list.map((section) => (
      section.id === sectionId ? { ...section, heading } : section
    )));
    setHeadingErrors((current) => ({
      ...current,
      [sectionId]: validateProtocolHeading(heading, { required: Boolean(heading.trim()) }),
    }));
    setFormError("");
  }

  function updatePoint(sectionId, pointIndex, value) {
    const next = sanitizeProtocolPoint(value);
    setWorkingSections((list) => list.map((section) => {
      if (section.id !== sectionId) return section;
      const points = section.points.map((point, index) => (index === pointIndex ? next : point));
      return { ...section, points };
    }));
    setPointErrors((current) => {
      const nextErrors = [...(current[sectionId] || [])];
      nextErrors[pointIndex] = String(next).trim() ? validateProtocolPoint(next) : "";
      return { ...current, [sectionId]: nextErrors };
    });
    setFormError("");
  }

  function removePoint(sectionId, pointIndex) {
    setWorkingSections((list) => list.map((section) => {
      if (section.id !== sectionId) return section;
      return { ...section, points: section.points.filter((_, index) => index !== pointIndex) };
    }));
    setPointErrors((current) => ({
      ...current,
      [sectionId]: (current[sectionId] || []).filter((_, index) => index !== pointIndex),
    }));
    setFormError("");
  }

  function addPoint(sectionId) {
    const section = workingSections.find((entry) => entry.id === sectionId);
    if (!section) return;
    if (section.points.length >= PROTOCOL_MAX_POINTS) {
      onToast?.(`A section cannot have more than ${PROTOCOL_MAX_POINTS} points.`);
      return;
    }

    setWorkingSections((list) => list.map((entry) => (
      entry.id === sectionId ? { ...entry, points: [...entry.points, ""] } : entry
    )));
    setPointErrors((current) => ({
      ...current,
      [sectionId]: [...(current[sectionId] || []), ""],
    }));
    setFormError("");
  }

  function movePoint(sectionId, fromIndex, toIndex) {
    setWorkingSections((list) => list.map((section) => (
      section.id === sectionId
        ? { ...section, points: moveListItem(section.points, fromIndex, toIndex) }
        : section
    )));
    setPointErrors((current) => ({
      ...current,
      [sectionId]: moveListItem(current[sectionId] || [], fromIndex, toIndex),
    }));
    setFormError("");
  }

  function createSection() {
    if (!canWrite || loading || saving) return;
    if (atSectionLimit) {
      onToast?.(`A protocol cannot have more than ${PROTOCOL_MAX_SECTIONS} sections.`);
      return;
    }

    setWorkingSections((list) => [...list, { id: newProtocolSectionId(), heading: "", points: [] }]);
    setFormError("");
  }

  function confirmDeleteSection() {
    const section = pendingDeleteSection;
    if (!section) return;
    setWorkingSections((list) => list.filter((entry) => entry.id !== section.id));
    setHeadingErrors((current) => {
      const next = { ...current };
      delete next[section.id];
      return next;
    });
    setPointErrors((current) => {
      const next = { ...current };
      delete next[section.id];
      return next;
    });
    setPendingDeleteSection(null);
    setFormError("");
    onToast?.(`Removed "${section.heading || "section"}" from the working protocol`);
  }

  function discardChanges() {
    applyLoadedSections(savedSections);
    onToast?.("Changes discarded");
  }

  async function saveVersion() {
    if (!userId || saving) return;

    const validation = validateProtocolSections(workingSections);
    if (!validation.ok) {
      const nextHeadingErrors = {};
      const nextPointErrors = {};
      workingSections.forEach((section, index) => {
        const entry = validation.errors?.[index];
        if (!entry) return;
        nextHeadingErrors[section.id] = entry.heading || "";
        nextPointErrors[section.id] = entry.points || [];
      });
      setHeadingErrors(nextHeadingErrors);
      setPointErrors(nextPointErrors);
      setFormError(validation.message);
      onToast?.(validation.message);
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const data = await saveUserProtocolSettings(userId, validation.sections);
      applyLoadedSections([]);
      setHistory(data?.history || []);
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

  async function confirmDeleteVersion() {
    const entry = pendingDelete;
    if (!entry || !userId || deletingId) return;
    const syncWorking = sectionsEqual(workingSections, savedSections);
    setPendingDelete(null);
    setDeletingId(entry.id);
    try {
      const data = await deleteUserProtocolSettings(userId, entry.id);
      const nextSections = cloneSections(data?.current?.sections || []);
      setHistory(data?.history || []);
      setSavedSections(cloneSections(nextSections));
      if (syncWorking) applyLoadedSections(nextSections);
      setExpandedVersion((current) => (current === entry.version ? (data?.current?.version ?? null) : current));
      onToast?.(`Deleted protocol v${entry.version}`);
    } catch (err) {
      onToast?.(err?.message || "Could not delete protocol version");
    } finally {
      setDeletingId("");
    }
  }

  async function deleteHistorySection(entry, remaining) {
    if (!userId || saving || savingVersionId) throw new Error("Could not delete section");
    const editedCurrent = sectionsEqual(savedSections, sectionsFromEntry(entry));
    const keepWorking = dirty;
    setSavingVersionId(entry.id);
    try {
      let data;
      if (remaining.length) {
        const validation = validateProtocolSections(remaining);
        if (!validation.ok) throw new Error(validation.message);
        await saveUserProtocolSettings(userId, validation.sections);
        data = await deleteUserProtocolSettings(userId, entry.id);
      } else {
        data = await deleteUserProtocolSettings(userId, entry.id);
      }
      const nextCurrent = cloneSections(data?.current?.sections || []);
      setHistory(data?.history || []);
      if (editedCurrent && !keepWorking) {
        applyLoadedSections(nextCurrent);
      } else if (editedCurrent) {
        setSavedSections(cloneSections(nextCurrent));
      }
      onToast?.("Section deleted");
    } catch (err) {
      onToast?.(err?.message || "Could not delete section");
      throw err;
    } finally {
      setSavingVersionId("");
    }
  }

  async function saveHistoryVersion(entry, sections) {
    if (!userId || saving || savingVersionId) return;
    setSavingVersionId(entry.id);
    try {
      const data = await updateUserProtocolSettings(userId, entry.id, sections);
      setHistory(data?.history || []);
      onToast?.("Changes saved");
    } catch (err) {
      onToast?.(err?.message || "Could not update protocol");
      throw err;
    } finally {
      setSavingVersionId("");
    }
  }

  return (
    <div className="ua-cp-section ua-cp-proto">
      <div className="ua-cp-proto__head">
        <div>
          <h2 className="ua-cp-proto__title">Protocol settings</h2>
          <p className="ua-cp-proto__sub">{pageSub}</p>
        </div>
        {canWrite ? (
          <div className="ua-cp-proto-work__actions">
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm colers"
              disabled={!dirty || saving || loading}
              onClick={discardChanges}
            >
              Discard changes
            </button>
            {dirty ? (
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm colored"
                onClick={saveVersion}
                disabled={saving || loading}
              >
                {saving ? "Saving…" : "Save version"}
              </button>
            ) : (
              <button type="button" className="btncolorss ua-cp-btn ua-cp-btn--muted ua-cp-btn--sm" disabled>
                Saved
              </button>
            )}
          </div>
        ) : null}
      </div>

      {loadError ? (
        <p className="ua-page-head__sub" style={{ color: "#b42318", margin: "0 0 16px" }}>{loadError}</p>
      ) : null}

      <div className="ua-cp-proto-panel">
        {loading ? (
          <p className="ua-page-head__sub" style={{ margin: "8px 0 0" }}>Loading protocol…</p>
        ) : null}

        {formError ? (
          <p className="ua-cp-proto__error" role="alert">{formError}</p>
        ) : null}

        <SectionsBoard
          sections={workingSections}
          canWrite={canWrite}
          saving={saving || loading}
          headingErrors={headingErrors}
          pointErrors={pointErrors}
          onHeadingChange={updateHeading}
          onPointChange={updatePoint}
          onRemovePoint={removePoint}
          onAddPoint={addPoint}
          onMovePoint={movePoint}
          onDeleteSection={setPendingDeleteSection}
          onAddSection={createSection}
        />
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
                canEdit={canWrite}
                saving={saving || savingVersionId === entry.id}
                onSave={(sections) => saveHistoryVersion(entry, sections)}
                onDeleteSavedSection={(remaining) => deleteHistorySection(entry, remaining)}
              />
            ))}
          </div>
        ) : (
          <div className="ua-cp-proto-history__empty">
            {loading ? "Loading history…" : "Nothing saved yet. Save the working protocol to start the history."}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Delete protocol version"
        title={pendingDelete ? `Delete v${pendingDelete.version}?` : "Delete this version?"}
        body="This removes the saved version from history. You can't undo this."
        cancelLabel="Keep version"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => !deletingId && setPendingDelete(null)}
        onConfirm={confirmDeleteVersion}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteSection)}
        tag="Delete section"
        title={pendingDeleteSection?.heading ? `Delete ${pendingDeleteSection.heading}?` : "Delete this section?"}
        body="This removes the heading and its points from the working protocol. Save a version to keep the change."
        cancelLabel="Keep section"
        confirmLabel="Delete section"
        confirmTone="danger"
        onCancel={() => setPendingDeleteSection(null)}
        onConfirm={confirmDeleteSection}
      />
    </div>
  );
}
