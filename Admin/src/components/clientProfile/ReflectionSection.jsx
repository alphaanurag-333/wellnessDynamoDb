import { useEffect, useMemo, useState } from "react";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import {
  fetchUserDailyReflectionSettings,
  saveUserDailyReflectionSettings,
  pushUserDailyReflectionBedtime,
} from "../../api/dailyReflectionApi.js";
import {
  DEFAULT_BEDTIME,
  formatBedtime,
  mapApiSectionsToForm,
  scoreOutOfTen,
  sectionPoints,
  selectedQuestionIdsFromForm,
  totalReflectionPoints,
  totalWeightage,
} from "../../data/reflectionData.js";

function ConfirmModal({ open, eyebrow, title, body, confirmLabel, confirmTone = "primary", busy, onClose, onConfirm }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !busy) onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={busy ? undefined : onClose} role="presentation">
      <div className="ua-cp-modal ua-cp-reflect-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="reflect-modal-title">
        <p className={`ua-cp-reflect-modal__eyebrow ua-cp-reflect-modal__eyebrow--${confirmTone}`}>{eyebrow}</p>
        <h3 id="reflect-modal-title" className="ua-cp-reflect-modal__title">{title}</h3>
        {body ? <p className="ua-cp-reflect-modal__body">{body}</p> : null}
        <div className="ua-cp-reflect-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline" disabled={busy} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`ua-cp-btn${confirmTone === "danger" ? " ua-cp-reflect-modal__confirm--danger" : " ua-cp-btn--primary"}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Sending…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReflectionQuestionRow({ index, question, canEdit, busy, onChange, onRemove }) {
  const locked = !canEdit || busy;

  return (
    <div className="ua-cp-reflect-question">
      <span className="ua-cp-reflect-question__num">{index + 1}.</span>
      <input
        type="text"
        className="ua-cp-reflect-question__text"
        value={question.text}
        readOnly={locked}
        onChange={(e) => onChange({ ...question, text: e.target.value })}
        placeholder="New reflection question"
      />
      <div className="ua-cp-reflect-question__score">
        <input
          type="number"
          min={0}
          max={question.max}
          value={question.score}
          readOnly={locked}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange({
              ...question,
              score: Number.isFinite(next) ? Math.min(question.max, Math.max(0, next)) : 0,
            });
          }}
        />
        <span>/ {question.max}</span>
        <button
          type="button"
          className="ua-cp-reflect-question__remove"
          disabled={locked}
          onClick={onRemove}
          aria-label="Remove question"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function ReflectionSectionCard({
  section,
  index,
  canEdit,
  busy,
  onUpdate,
  onRemove,
  onToggle,
}) {
  const points = sectionPoints(section);

  function addQuestion() {
    if (!canEdit || busy) return;
    onUpdate({
      ...section,
      questions: [
        ...section.questions,
        {
          id: `q-local-${Date.now()}`,
          text: "New reflection question",
          score: 7,
          max: 10,
          fixed: false,
          selected: true,
          fromBank: false,
        },
      ],
    });
  }

  function updateQuestion(qid, next) {
    onUpdate({
      ...section,
      questions: section.questions.map((q) => (q.id === qid ? next : q)),
    });
  }

  function removeQuestion(qid) {
    onUpdate({
      ...section,
      questions: section.questions.filter((q) => q.id !== qid),
    });
  }

  const rowLocked = !canEdit || busy;

  return (
    <div className="ua-cp-reflect-section">
      <div className="ua-cp-reflect-section__head">
        <div className="ua-cp-reflect-section__head-left">
          <button type="button" className="ua-cp-reflect-section__toggle" onClick={onToggle} aria-expanded={section.expanded}>
            <span className={`ua-cp-reflect-section__chev${section.expanded ? " ua-cp-reflect-section__chev--open" : ""}`} aria-hidden="true" />
          </button>
          <span className="ua-cp-reflect-section__badge">{index + 1}</span>
          <input
            type="text"
            className="ua-cp-reflect-section__title"
            value={section.title}
            readOnly={rowLocked}
            onChange={(e) => onUpdate({ ...section, title: e.target.value })}
          />
        </div>
        <div className="ua-cp-reflect-section__meta">
          <label className="ua-cp-reflect-section__wt">
            WT
            <input
              type="number"
              min={0}
              value={section.weight}
              readOnly={rowLocked}
              onChange={(e) => onUpdate({ ...section, weight: Number(e.target.value) || 0 })}
            />
          </label>
          <span className="ua-cp-reflect-section__points">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11h14v10H5z"></path><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>
            {points.label}
          </span>
          <button
            type="button"
            className="ua-cp-reflect-section__remove"
            disabled={rowLocked}
            onClick={onRemove}
            aria-label={`Delete ${section.title}`}
          >
            ×
          </button>
        </div>
      </div>
      {section.expanded ? (
        <div className="ua-cp-reflect-section__body">
          {section.questions.map((question, qIndex) => (
            <ReflectionQuestionRow
              key={question.id}
              index={qIndex}
              question={question}
              canEdit={canEdit}
              busy={busy}
              onChange={(next) => updateQuestion(question.id, next)}
              onRemove={() => removeQuestion(question.id)}
            />
          ))}
          <button
            type="button"
            className="ua-cp-reflect-add-question"
            disabled={!canEdit || busy}
            onClick={addQuestion}
          >
            + Add question
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ReflectionSection({ user, onToast }) {
  const userId = String(user?.id || "").trim();
  const isHealClient = String(user?.userTier || "").toLowerCase() === "heal" || user?.tier === "Seek to Heal";
  const { can, viewAs } = useViewAs();
  const canEdit =
    can("console.diet.edit") ||
    viewAs === "wc" ||
    viewAs === "awc" ||
    viewAs === "admin";

  const [sections, setSections] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [bedtime, setBedtime] = useState(DEFAULT_BEDTIME);
  const [savedBedtime, setSavedBedtime] = useState(DEFAULT_BEDTIME);
  const [todayScore, setTodayScore] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pushOpen, setPushOpen] = useState(false);

  const clientName = user?.name?.split(" ")[0] || "Client";
  const weightTotal = useMemo(() => totalWeightage(sections), [sections]);
  const pointTotals = useMemo(() => totalReflectionPoints(sections), [sections]);
  const displayScore = useMemo(
    () => scoreOutOfTen(pointTotals.earned, pointTotals.max),
    [pointTotals],
  );
  const currentIds = useMemo(() => selectedQuestionIdsFromForm(sections), [sections]);
  const dirty = currentIds.join("|") !== savedIds.join("|") || bedtime !== savedBedtime;
  const busy = saving || pushing;

  useEffect(() => {
    if (!userId || !isHealClient) {
      setSections([]);
      setSavedIds([]);
      setLoading(false);
      setLoadError("");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");

    fetchUserDailyReflectionSettings(userId)
      .then((data) => {
        if (cancelled) return;
        const nextSections = mapApiSectionsToForm(data?.sections || []);
        setSections(nextSections);
        setSavedIds(data?.selectedQuestionIds || selectedQuestionIdsFromForm(nextSections));
        setBedtime(data?.bedtime || DEFAULT_BEDTIME);
        setSavedBedtime(data?.bedtime || DEFAULT_BEDTIME);
        setTodayScore(data?.todayScore || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load daily reflection");
        onToast?.(err?.message || "Failed to load daily reflection");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isHealClient, onToast, userId]);

  function updateSection(id, next) {
    setSections((list) => list.map((s) => (s.id === id ? next : s)));
  }

  function toggleSection(id) {
    setSections((list) => list.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)));
  }

  function addSection() {
    if (!canEdit || busy) return;
    setSections((list) => [
      ...list,
      {
        id: `sec-local-${Date.now()}`,
        title: "New section",
        weight: 0,
        locked: false,
        expanded: true,
        questions: [{
          id: `q-local-${Date.now()}`,
          text: "New reflection question",
          score: 7,
          max: 10,
          fixed: false,
          selected: true,
          fromBank: false,
        }],
      },
    ]);
  }

  function confirmDelete() {
    if (!deleteTarget || busy) return;
    setSections((list) => list.filter((s) => s.id !== deleteTarget.id));
    onToast?.(`Removed ${deleteTarget.title}`);
    setDeleteTarget(null);
  }

  async function saveReflection() {
    if (!userId || !canEdit || saving) return;
    setSaving(true);
    try {
      const data = await saveUserDailyReflectionSettings(userId, {
        selectedQuestionIds: currentIds,
        bedtime,
      });
      const nextSections = mapApiSectionsToForm(data?.sections || []);
      // Preserve locally edited scores/titles where ids still exist
      setSections((prev) => {
        if (!nextSections.length) return prev;
        const scoreMap = new Map();
        prev.forEach((section) => {
          section.questions.forEach((q) => scoreMap.set(q.id, q));
        });
        return nextSections.map((section) => ({
          ...section,
          questions: section.questions.map((q) => {
            const local = scoreMap.get(q.id);
            return local ? { ...q, score: local.score, text: local.text || q.text } : q;
          }),
        }));
      });
      setSavedIds(data?.selectedQuestionIds || currentIds);
      setBedtime(data?.bedtime || bedtime);
      setSavedBedtime(data?.bedtime || bedtime);
      setTodayScore(data?.todayScore || todayScore);
      onToast?.("Reflection saved");
    } catch (err) {
      onToast?.(err?.message || "Could not save daily reflection");
    } finally {
      setSaving(false);
    }
  }

  async function sendBedtimePush() {
    if (!userId || !canEdit || pushing) return;
    setPushing(true);
    try {
      if (dirty) {
        await saveUserDailyReflectionSettings(userId, {
          selectedQuestionIds: currentIds,
          bedtime,
        });
        setSavedIds(currentIds);
        setSavedBedtime(bedtime);
      }
      await pushUserDailyReflectionBedtime(userId);
      setPushOpen(false);
      onToast?.("Reminder pushed to app");
    } catch (err) {
      onToast?.(err?.message || "Could not send bedtime reminder");
    } finally {
      setPushing(false);
    }
  }

  if (!userId) {
    return <p className="ua-cp-bms-library-hint">Client is required to load daily reflection.</p>;
  }

  if (!isHealClient) {
    return (
      <div className="ua-cp-section ua-cp-reflect">
        <div className="ua-cp-reflect__head">
          <h2 className="ua-cp-reflect__title">Daily Reflection</h2>
          <p className="ua-cp-reflect__sub">Daily reflection is available for Heal clients.</p>
        </div>
      </div>
    );
  }

  const pointsLabel = `${pointTotals.earned} / ${pointTotals.max || 0} points`;

  return (
    <div className="ua-cp-section ua-cp-reflect">
      <div className="ua-cp-reflect__head">
        <h2 className="ua-cp-reflect__title">Daily Reflection</h2>
        <p className="ua-cp-reflect__sub">Scored daily check-in · monthly totals decide the champion</p>
      </div>

<div style={{justifyContent:"center"}}>
      <div style={{width:"max-content"}} className="ua-cp-reflect-score">
        <div className="ua-cp-reflect-score__left">
          <span>Today&apos;s reflection score</span>
          <strong>{pointsLabel}</strong>
        </div>
        <div className="ua-cp-reflect-score__right">
          <strong>{Number(displayScore || 0).toFixed(1)}</strong>
          <span>/ 10</span>
        </div>
      </div>
      </div>

      <div className="ua-cp-reflect-callouts">
        <div className="ua-cp-reflect-callout ua-cp-reflect-callout--app">
          <div className="ua-cp-reflect-callout__row">
            <span className="ua-cp-reflect-callout__icon" aria-hidden="true">🔔</span>
            <p>
              Unlocks in the app <strong>30 min before bedtime</strong> (~{formatBedtime(bedtime)}) and a reminder is sent{" "}
              <strong>every night before bed.</strong>
            </p>
          </div>
          <div className="ua-cp-reflect-callout__actions">
            <label className="ua-cp-reflect-bedtime">
              <span className="ua-cp-reflect-bedtime__label">Bedtime</span>
              <input
                type="time"
                value={bedtime}
                disabled={!canEdit || busy}
                onChange={(e) => setBedtime(e.target.value)}
              />
              <span className="ua-cp-reflect-bedtime__value">
                <span className="ua-cp-reflect-bedtime__clock" aria-hidden="true" />
                {formatBedtime(bedtime)}
              </span>
            </label>
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
              disabled={!canEdit || busy}
              onClick={() => setPushOpen(true)}
            >
              Push to app
            </button>
          </div>
        </div>
        <div className="ua-cp-reflect-callout ua-cp-reflect-callout--champ">
          <div className="ua-cp-reflect-callout__row">
            <span className="ua-cp-reflect-callout__icon" aria-hidden="true">🏁</span>
            <p style={{color:"rgb(138, 109, 0)"}}>
              Championship counts from the <strong>1st of each month</strong>. <strong>Gut Reset</strong> days are excluded.
            </p>
          </div>
        </div>
      </div>

      <div className="ua-cp-reflect-weightage">
        <span>Total weightage</span>
        <strong className={weightTotal === 100 ? "ua-cp-reflect-weightage__ok" : ""}>{weightTotal} / 100</strong>
      </div>

      {loading ? (
        <p className="ua-cp-bms-library-hint">Loading daily reflection…</p>
      ) : loadError ? (
        <p className="ua-cp-bms-library-hint">{loadError}</p>
      ) : (
        <div className="ua-cp-reflect-sections">
          {sections.map((section, index) => (
            <ReflectionSectionCard
              key={section.id}
              section={section}
              index={index}
              canEdit={canEdit}
              busy={busy}
              onUpdate={(next) => updateSection(section.id, next)}
              onRemove={() => setDeleteTarget(section)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
          {!sections.length ? (
            <p className="ua-cp-bms-library-hint">
              No live DRF questions yet. Add them in Config → DRF activity bank, or add a section below.
            </p>
          ) : null}
        </div>
      )}

      <div className="ua-cp-reflect-foot">
        <button
          type="button"
          className="ua-cp-reflect-add-section"
          disabled={!canEdit || busy || loading}
          onClick={addSection}
        >
          + Add section
        </button>
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--primary ua-cp-reflect-save"
          disabled={!canEdit || saving || loading}
          onClick={saveReflection}
        >
          {saving ? "Saving…" : "Save reflection"}
        </button>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        eyebrow="This cannot be undone"
        title={deleteTarget ? `Delete the “${deleteTarget.title}” reflection section?` : ""}
        body="All of its questions and their weightage are removed from the daily reflection."
        confirmLabel="Delete"
        confirmTone="danger"
        busy={busy}
        onClose={() => !busy && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmModal
        open={pushOpen}
        eyebrow="Confirm this action"
        title={`Push an app reminder to ${clientName}?`}
        body="A notification goes to their phone straight away."
        confirmLabel="Yes, send it"
        busy={pushing}
        onClose={() => !pushing && setPushOpen(false)}
        onConfirm={sendBedtimePush}
      />
    </div>
  );
}
