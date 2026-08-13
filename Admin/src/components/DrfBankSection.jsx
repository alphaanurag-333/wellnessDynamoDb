import { useMemo, useState } from "react";
import {
  drfLiveQuestionCount,
  drfRemainingWeight,
  drfSectionPointsTotal,
  drfTotalQuestionCount,
  drfWeightTotal,
} from "../data/drfBankData.js";

function Panel({ title, subtitle, actions, children, className = "" }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      {hasHead ? (
        <div className="ua-cfg-panel__head">
          <div>
            {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
            {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function parsePoints(value) {
  const amount = Number(String(value).replace(/[^\d]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function parseWeight(value) {
  const amount = Number(String(value).replace(/[^\d]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  return Math.min(100, Math.max(0, amount));
}

export function DrfBankSection({ sections, setSections, onToast }) {
  const [expanded, setExpanded] = useState(() => new Set(sections.map((entry) => entry.id)));
  const [sectionDraft, setSectionDraft] = useState({ name: "", weight: "" });
  const [questionDrafts, setQuestionDrafts] = useState({});

  const weightTotal = useMemo(() => drfWeightTotal(sections), [sections]);
  const liveQuestions = useMemo(() => drfLiveQuestionCount(sections), [sections]);
  const totalQuestions = useMemo(() => drfTotalQuestionCount(sections), [sections]);
  const remainingWeight = useMemo(() => drfRemainingWeight(sections), [sections]);

  function updateSections(updater) {
    setSections((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }

  function updateSection(sectionId, patch) {
    updateSections((prev) =>
      prev.map((entry) => (entry.id === sectionId ? { ...entry, ...patch } : entry)),
    );
  }

  function updateQuestion(sectionId, questionId, patch) {
    updateSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((entry) =>
                entry.id === questionId ? { ...entry, ...patch } : entry,
              ),
            }
          : section,
      ),
    );
  }

  function toggleExpanded(sectionId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(sections.map((entry) => entry.id)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  function addSection() {
    const name = sectionDraft.name.trim();
    const weight = parseWeight(sectionDraft.weight);
    if (!name) {
      onToast("Section name is required");
      return;
    }
    if (!weight) {
      onToast("Enter a section weight");
      return;
    }
    if (weight > remainingWeight) {
      onToast(`Only ${remainingWeight}% weight is free`);
      return;
    }
    const id = `sec-${Date.now()}`;
    updateSections((prev) => [
      ...prev,
      { id, name, weight, live: true, fixed: false, questions: [] },
    ]);
    setExpanded((prev) => new Set([...prev, id]));
    setSectionDraft({ name: "", weight: "" });
    onToast(`${name} section added`);
  }

  function addQuestion(sectionId) {
    const draft = questionDrafts[sectionId] ?? { name: "", points: "" };
    const name = draft.name.trim();
    const points = parsePoints(draft.points) || 10;
    if (!name) {
      onToast("Question name is required");
      return;
    }
    updateSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: [
                ...section.questions,
                {
                  id: `q-${Date.now()}`,
                  name,
                  points,
                  enabled: true,
                  fixed: false,
                },
              ],
            }
          : section,
      ),
    );
    setQuestionDrafts((prev) => ({ ...prev, [sectionId]: { name: "", points: "" } }));
    onToast("Question added");
  }

  return (
    <>
      <Panel
        className="ua-cfg-drf"
        title="Daily Reflection form · sections"
        subtitle="Section weights must total 100%, and the questions inside one section must total 100 points — anything above the cap is trimmed on save. Mark a section or question Fixed to lock its weightage against coach edits."
        actions={(
          <div className="ua-cfg-drf__head-actions">
            <span className={`ua-cfg-drf__allocated${weightTotal === 100 ? " is-full" : ""}`}>
              {weightTotal === 100 ? "100% allocated" : `${weightTotal}% allocated`}
            </span>
            <span className="ua-cfg-drf__live-count">{liveQuestions} of {totalQuestions} questions live</span>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={expandAll}>
              Expand all
            </button>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={collapseAll}>
              Collapse all
            </button>
          </div>
        )}
      >
        <div className="ua-cfg-drf-sections">
          {sections.map((section) => {
            const isOpen = expanded.has(section.id);
            const pointsTotal = drfSectionPointsTotal(section);
            const liveInSection = section.questions.filter((entry) => entry.enabled).length;
            const draft = questionDrafts[section.id] ?? { name: "", points: "" };

            return (
              <article key={section.id} className={`ua-cfg-drf-section${isOpen ? " is-open" : ""}`}>
                <div className="ua-cfg-drf-section__head">
                  <button
                    type="button"
                    className="ua-cfg-drf-section__toggle"
                    aria-expanded={isOpen}
                    onClick={() => toggleExpanded(section.id)}
                  >
                    {isOpen ? "▾" : "▸"}
                  </button>
                  <input
                    type="text"
                    className="ua-cfg-drf-section__name"
                    value={section.name}
                    onChange={(event) => updateSection(section.id, { name: event.target.value })}
                  />
                  <div className="ua-cfg-drf-section__weight">
                    <span>Weight</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={section.weight}
                      disabled={section.fixed}
                      onChange={(event) =>
                        updateSection(section.id, { weight: parseWeight(event.target.value) })
                      }
                    />
                    <span>%</span>
                  </div>
                  <span className="ua-cfg-drf-section__meta">
                    {liveInSection} of {section.questions.length} questions · {pointsTotal}/100 pts
                  </span>
                  <div className="ua-cfg-drf-section__controls">
                    <button
                      type="button"
                      className={`ua-cfg-drf-fix${section.fixed ? " is-on" : ""}`}
                      onClick={() => updateSection(section.id, { fixed: !section.fixed })}
                    >
                      Fix
                    </button>
                    <span className={`ua-cfg-drf-status${section.live ? " is-on" : ""}`}>
                      {section.live ? "Live" : "Off"}
                    </span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${section.live ? " ua-toggle--on" : ""}`}
                      aria-pressed={section.live}
                      onClick={() => updateSection(section.id, { live: !section.live })}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn ua-cfg-drf-section__delete"
                      aria-label={`Remove ${section.name}`}
                      onClick={() => {
                        updateSections((prev) => prev.filter((entry) => entry.id !== section.id));
                        onToast(`${section.name} removed`);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="ua-cfg-drf-section__body">
                    {section.questions.map((question, index) => (
                      <div key={question.id} className="ua-cfg-drf-question">
                        <span className="ua-cfg-drf-question__num">{index + 1}</span>
                        <input
                          type="text"
                          className="ua-cfg-drf-question__name"
                          value={question.name}
                          onChange={(event) =>
                            updateQuestion(section.id, question.id, { name: event.target.value })
                          }
                        />
                        <div className="ua-cfg-drf-question__points">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={question.points}
                            disabled={question.fixed}
                            onChange={(event) =>
                              updateQuestion(section.id, question.id, {
                                points: parsePoints(event.target.value),
                              })
                            }
                          />
                          <span>pts</span>
                        </div>
                        <div className="ua-cfg-drf-question__controls">
                          <button
                            type="button"
                            className={`ua-cfg-drf-fix${question.fixed ? " is-on" : ""}`}
                            onClick={() =>
                              updateQuestion(section.id, question.id, { fixed: !question.fixed })
                            }
                          >
                            Fix
                          </button>
                          <span className={`ua-cfg-drf-status${question.enabled ? " is-on" : ""}`}>
                            {question.enabled ? "On" : "Off"}
                          </span>
                          <button
                            type="button"
                            className={`ua-toggle ua-toggle--sm${question.enabled ? " ua-toggle--on" : ""}`}
                            aria-pressed={question.enabled}
                            onClick={() =>
                              updateQuestion(section.id, question.id, { enabled: !question.enabled })
                            }
                          >
                            <span className="ua-toggle__knob" />
                          </button>
                          <button
                            type="button"
                            className="ua-cfg-icon-btn ua-cfg-drf-question__delete"
                            aria-label={`Remove ${question.name}`}
                            onClick={() => {
                              updateSections((prev) =>
                                prev.map((entry) =>
                                  entry.id === section.id
                                    ? {
                                        ...entry,
                                        questions: entry.questions.filter(
                                          (row) => row.id !== question.id,
                                        ),
                                      }
                                    : entry,
                                ),
                              );
                              onToast("Question removed");
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="ua-cfg-drf-add-q">
                      <input
                        type="text"
                        className="ua-cfg-drf-add-q__name"
                        placeholder="Add a question to this section…"
                        value={draft.name}
                        onChange={(event) =>
                          setQuestionDrafts((prev) => ({
                            ...prev,
                            [section.id]: { ...draft, name: event.target.value },
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") addQuestion(section.id);
                        }}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        className="ua-cfg-drf-add-q__pts"
                        placeholder="Pts"
                        value={draft.points}
                        onChange={(event) =>
                          setQuestionDrafts((prev) => ({
                            ...prev,
                            [section.id]: { ...draft, points: event.target.value },
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                        onClick={() => addQuestion(section.id)}
                      >
                        + Add question
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Add a section"
        subtitle={`Section weights must total 100% — a new section can only take the weight that is still free (${remainingWeight}% available). Questions inside a section total 100 points.`}
      >
        <div className="ua-cfg-drf-add-section">
          <input
            type="text"
            className="ua-cfg-drf-add-section__name"
            placeholder="Section name · e.g. Sleep quality"
            value={sectionDraft.name}
            onChange={(event) => setSectionDraft({ ...sectionDraft, name: event.target.value })}
          />
          <input
            type="text"
            inputMode="numeric"
            className="ua-cfg-drf-add-section__weight"
            placeholder="Weight %"
            value={sectionDraft.weight}
            onChange={(event) => setSectionDraft({ ...sectionDraft, weight: event.target.value })}
          />
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            disabled={!remainingWeight}
            onClick={addSection}
          >
            + Add section
          </button>
        </div>
      </Panel>
    </>
  );
}

export { DRF_FORM_SECTIONS } from "../data/drfBankData.js";
