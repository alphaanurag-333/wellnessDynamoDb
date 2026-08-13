import { useEffect, useMemo, useState } from "react";
import {
  formatBedtime,
  REFLECTION_SECTIONS,
  REFLECTION_SUMMARY,
  sectionPoints,
  totalWeightage,
} from "../../data/reflectionData.js";

function ConfirmModal({ open, eyebrow, title, body, confirmLabel, confirmTone = "primary", onClose, onConfirm }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-modal ua-cp-reflect-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="reflect-modal-title">
        <p className={`ua-cp-reflect-modal__eyebrow ua-cp-reflect-modal__eyebrow--${confirmTone}`}>{eyebrow}</p>
        <h3 id="reflect-modal-title" className="ua-cp-reflect-modal__title">{title}</h3>
        {body ? <p className="ua-cp-reflect-modal__body">{body}</p> : null}
        <div className="ua-cp-reflect-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`ua-cp-btn${confirmTone === "danger" ? " ua-cp-reflect-modal__confirm--danger" : " ua-cp-btn--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReflectionQuestionRow({ index, question, onChange, onRemove }) {
  return (
    <div className="ua-cp-reflect-question">
      <span className="ua-cp-reflect-question__num">{index + 1}.</span>
      <input
        type="text"
        className="ua-cp-reflect-question__text"
        value={question.text}
        onChange={(e) => onChange({ ...question, text: e.target.value })}
      />
      <div className="ua-cp-reflect-question__score">
        <input
          type="number"
          min={0}
          max={question.max}
          value={question.score}
          onChange={(e) => onChange({ ...question, score: Number(e.target.value) || 0 })}
        />
        <span>/ {question.max}</span>
        <button type="button" className="ua-cp-reflect-question__remove" onClick={onRemove} aria-label="Remove question">×</button>
      </div>
    </div>
  );
}

function ReflectionSectionCard({
  section,
  index,
  onUpdate,
  onRemove,
  onToggle,
}) {
  const points = sectionPoints(section);

  function addQuestion() {
    onUpdate({
      ...section,
      questions: [
        ...section.questions,
        { id: `q-${Date.now()}`, text: "New reflection question", score: 7, max: 10 },
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

  return (
    <div className="ua-cp-reflect-section">
      <div className="ua-cp-reflect-section__head">
        <div className="ua-cp-reflect-section__head-left">
          <button type="button" className="ua-cp-reflect-section__toggle" onClick={onToggle} aria-expanded={section.expanded}>
            <span className={`ua-cp-reflect-section__chev${section.expanded ? " ua-cp-reflect-section__chev--open" : ""}`} aria-hidden="true">›</span>
          </button>
          <span className="ua-cp-reflect-section__badge">{index + 1}</span>
          <input
            type="text"
            className="ua-cp-reflect-section__title"
            value={section.title}
            onChange={(e) => onUpdate({ ...section, title: e.target.value })}
          />
        </div>
        <div className="ua-cp-reflect-section__meta">
          {section.locked ? (
            <span className="ua-cp-reflect-section__pill" title="Weight locked">
              <span aria-hidden="true">🔒</span> WT {section.weight}
            </span>
          ) : (
            <label className="ua-cp-reflect-section__wt">
              WT
              <input
                type="number"
                min={0}
                value={section.weight}
                onChange={(e) => onUpdate({ ...section, weight: Number(e.target.value) || 0 })}
              />
            </label>
          )}
          <span className="ua-cp-reflect-section__pill ua-cp-reflect-section__points">
            {section.locked ? <span aria-hidden="true">🔒</span> : null}
            {points.label}
          </span>
          <button type="button" className="ua-cp-reflect-section__remove" onClick={onRemove} aria-label={`Delete ${section.title}`}>×</button>
        </div>
      </div>
      {section.expanded ? (
        <div className="ua-cp-reflect-section__body">
          {section.questions.map((question, qIndex) => (
            <ReflectionQuestionRow
              key={question.id}
              index={qIndex}
              question={question}
              onChange={(next) => updateQuestion(question.id, next)}
              onRemove={() => removeQuestion(question.id)}
            />
          ))}
          <button type="button" className="ua-cp-reflect-add-question" onClick={addQuestion}>+ Add question</button>
        </div>
      ) : null}
    </div>
  );
}

export function ReflectionSection({ user, onToast }) {
  const [sections, setSections] = useState(REFLECTION_SECTIONS);
  const [bedtime, setBedtime] = useState(REFLECTION_SUMMARY.bedtime);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pushOpen, setPushOpen] = useState(false);

  const weightTotal = useMemo(() => totalWeightage(sections), [sections]);
  const clientName = user?.name?.split(" ")[0] || "Client";

  function updateSection(id, next) {
    setSections((list) => list.map((s) => (s.id === id ? next : s)));
  }

  function toggleSection(id) {
    setSections((list) => list.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)));
  }

  function addSection() {
    setSections((list) => [
      ...list,
      {
        id: `sec-${Date.now()}`,
        title: "New section",
        weight: 0,
        locked: false,
        expanded: true,
        questions: [{ id: `q-${Date.now()}`, text: "New reflection question", score: 7, max: 10 }],
      },
    ]);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setSections((list) => list.filter((s) => s.id !== deleteTarget.id));
    onToast?.(`Removed ${deleteTarget.title}`);
    setDeleteTarget(null);
  }

  return (
    <div className="ua-cp-section ua-cp-reflect">
      <div className="ua-cp-reflect__head">
        <h2 className="ua-cp-reflect__title">Daily Reflection</h2>
        <p className="ua-cp-reflect__sub">Scored daily check-in · monthly totals decide the champion</p>
      </div>

      <div className="ua-cp-reflect-score">
        <div className="ua-cp-reflect-score__left">
          <span>Today&apos;s reflection score</span>
          <strong>{REFLECTION_SUMMARY.todayPoints} / {REFLECTION_SUMMARY.maxPoints} points</strong>
        </div>
        <div className="ua-cp-reflect-score__right">
          <strong>{REFLECTION_SUMMARY.score.toFixed(1)}</strong>
          <span>/ {REFLECTION_SUMMARY.maxScore}</span>
        </div>
      </div>

      <div className="ua-cp-reflect-callouts">
        <div className="ua-cp-reflect-callout ua-cp-reflect-callout--app">
          <span className="ua-cp-reflect-callout__icon" aria-hidden="true">🔔</span>
          <p>
            Unlocks in the app 30 min before bedtime (~10:00 PM) and a reminder is sent every night before bed.
          </p>
          <div className="ua-cp-reflect-callout__actions">
            <label className="ua-cp-reflect-bedtime">
              Bedtime
              <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
              <span>{formatBedtime(bedtime)}</span>
            </label>
            <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => setPushOpen(true)}>
              Push to app
            </button>
          </div>
        </div>
        <div className="ua-cp-reflect-callout ua-cp-reflect-callout--champ">
          <span className="ua-cp-reflect-callout__icon" aria-hidden="true">🏁</span>
          <p>
            Championship counts from the <strong>1st of each month</strong>. <strong>Gut Reset</strong> days are excluded.
          </p>
        </div>
      </div>

      <div className="ua-cp-reflect-weightage">
        <span>Total weightage</span>
        <strong className={weightTotal === 100 ? " ua-cp-reflect-weightage__ok" : ""}>{weightTotal} / 100</strong>
      </div>

      <div className="ua-cp-reflect-sections">
        {sections.map((section, index) => (
          <ReflectionSectionCard
            key={section.id}
            section={section}
            index={index}
            onUpdate={(next) => updateSection(section.id, next)}
            onRemove={() => setDeleteTarget(section)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>

      <div className="ua-cp-reflect-foot">
        <button type="button" className="ua-cp-reflect-add-section" onClick={addSection}>+ Add section</button>
        <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-reflect-save" onClick={() => onToast?.("Reflection saved")}>
          Save reflection
        </button>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        eyebrow="This cannot be undone"
        title={deleteTarget ? `Delete the “${deleteTarget.title}” reflection section?` : ""}
        body="All of its questions and their weightage are removed from the daily reflection."
        confirmLabel="Delete"
        confirmTone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmModal
        open={pushOpen}
        eyebrow="Confirm this action"
        title={`Push an app reminder to ${clientName}?`}
        body="A notification goes to their phone straight away."
        confirmLabel="Yes, send it"
        onClose={() => setPushOpen(false)}
        onConfirm={() => {
          setPushOpen(false);
          onToast?.("Reminder pushed to app");
        }}
      />
    </div>
  );
}
