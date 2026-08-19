import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateDrfQuestion,
  adminCreateDrfSection,
  adminDeleteDrfQuestion,
  adminDeleteDrfSection,
  adminGetDrfConfig,
  adminUpdateDrfQuestion,
  adminUpdateDrfSection,
} from "../api/drfConfigApi.js";
import {
  drfLiveQuestionCount,
  drfRemainingSectionPoints,
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
          <div className="ua-cfg-panel__copy">
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [sectionDraft, setSectionDraft] = useState({ name: "", weight: "" });
  const [questionDrafts, setQuestionDrafts] = useState({});
  const sectionsRef = useRef(sections);
  const persistTimers = useRef({});

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => () => {
    Object.values(persistTimers.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const weightTotal = useMemo(() => drfWeightTotal(sections), [sections]);
  const liveQuestions = useMemo(() => drfLiveQuestionCount(sections), [sections]);
  const totalQuestions = useMemo(() => drfTotalQuestionCount(sections), [sections]);
  const remainingWeight = useMemo(() => drfRemainingWeight(sections), [sections]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetDrfConfig(null);
      setSections(data.sections);
      setExpanded(new Set(data.sections.map((entry) => entry.id)));
    } catch (error) {
      onToast(error?.message || "Failed to load DRF config");
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [onToast, setSections]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  function schedulePersist(key, fn) {
    window.clearTimeout(persistTimers.current[key]);
    persistTimers.current[key] = window.setTimeout(() => {
      fn().catch((error) => {
        onToast(error?.message || "Failed to save DRF config");
        loadConfig();
      });
    }, 450);
  }

  function updateSectionLocal(sectionId, patch) {
    setSections((prev) =>
      prev.map((entry) => (entry.id === sectionId ? { ...entry, ...patch } : entry)),
    );
  }

  function updateQuestionLocal(sectionId, questionId, patch) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: (section.questions || []).map((entry) =>
                entry.id === questionId ? { ...entry, ...patch } : entry,
              ),
            }
          : section,
      ),
    );
  }

  function persistSection(sectionId, patch) {
    updateSectionLocal(sectionId, patch);
    schedulePersist(`section:${sectionId}:${Object.keys(patch).join(",")}`, async () => {
      const updated = await adminUpdateDrfSection(null, sectionId, patch);
      setSections((prev) =>
        prev.map((entry) => (entry.id === sectionId ? { ...entry, ...updated } : entry)),
      );
    });
  }

  function persistQuestion(sectionId, questionId, patch) {
    updateQuestionLocal(sectionId, questionId, patch);
    schedulePersist(`question:${sectionId}:${questionId}:${Object.keys(patch).join(",")}`, async () => {
      const updated = await adminUpdateDrfQuestion(null, sectionId, questionId, patch);
      updateQuestionLocal(sectionId, questionId, updated);
    });
  }

  function persistQuestionPoints(section, question, rawValue) {
    const parsed = parsePoints(rawValue);
    const remaining = drfRemainingSectionPoints(section, { excludeId: question.id });
    const nextPoints = question.enabled ? Math.min(parsed, remaining) : parsed;
    if (nextPoints !== parsed) {
      onToast(`Only ${remaining} pts are free in this section`);
    }
    persistQuestion(section.id, question.id, { points: nextPoints });
  }

  async function runImmediate(action, rollback) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      if (rollback) rollback();
      onToast(error?.message || "Failed to save DRF config");
    } finally {
      setBusy(false);
    }
  }

  async function addSection() {
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
    setBusy(true);
    try {
      const created = await adminCreateDrfSection(null, { name, weight, live: true });
      setSections((prev) => [...prev, { ...created, questions: created.questions || [] }]);
      setExpanded((prev) => new Set([...prev, created.id]));
      setSectionDraft({ name: "", weight: "" });
      onToast(`${name} section added`);
    } catch (error) {
      onToast(error?.message || "Failed to add section");
    } finally {
      setBusy(false);
    }
  }

  async function removeSection(section) {
    const previous = sectionsRef.current;
    setSections((prev) => prev.filter((entry) => entry.id !== section.id));
    await runImmediate(
      async () => {
        await adminDeleteDrfSection(null, section.id);
        onToast(`${section.name} removed`);
      },
      () => setSections(previous),
    );
  }

  async function toggleSectionLive(section) {
    const nextLive = !section.live;
    updateSectionLocal(section.id, { live: nextLive });
    await runImmediate(
      async () => {
        const updated = await adminUpdateDrfSection(null, section.id, { live: nextLive });
        setSections((prev) =>
          prev.map((entry) => (entry.id === section.id ? { ...entry, ...updated } : entry)),
        );
      },
      () => updateSectionLocal(section.id, { live: section.live }),
    );
  }

  async function toggleSectionFixed(section) {
    const nextFixed = !section.fixed;
    updateSectionLocal(section.id, { fixed: nextFixed });
    await runImmediate(
      async () => {
        const updated = await adminUpdateDrfSection(null, section.id, { fixed: nextFixed });
        setSections((prev) =>
          prev.map((entry) => (entry.id === section.id ? { ...entry, ...updated } : entry)),
        );
      },
      () => updateSectionLocal(section.id, { fixed: section.fixed }),
    );
  }

  async function addQuestion(sectionId) {
    const draft = questionDrafts[sectionId] ?? { name: "", points: "" };
    const name = draft.name.trim();
    const section = sections.find((entry) => entry.id === sectionId);
    const remaining = drfRemainingSectionPoints(section);
    if (!name) {
      onToast("Question name is required");
      return;
    }
    if (remaining <= 0) {
      onToast("This section already has 100 points. Lower a question's pts first.");
      return;
    }
    const requested = parsePoints(draft.points) || Math.min(10, remaining);
    if (requested > remaining) {
      onToast(`Only ${remaining} pts are free in this section`);
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateDrfQuestion(null, sectionId, {
        name,
        points: requested,
        enabled: true,
      });
      setSections((prev) =>
        prev.map((entry) =>
          entry.id === sectionId
            ? { ...entry, questions: [...(entry.questions || []), created] }
            : entry,
        ),
      );
      setQuestionDrafts((prev) => ({ ...prev, [sectionId]: { name: "", points: "" } }));
      onToast("Question added");
    } catch (error) {
      onToast(error?.message || "Failed to add question");
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestion(sectionId, question) {
    const previous = sectionsRef.current;
    setSections((prev) =>
      prev.map((entry) =>
        entry.id === sectionId
          ? { ...entry, questions: (entry.questions || []).filter((row) => row.id !== question.id) }
          : entry,
      ),
    );
    await runImmediate(
      async () => {
        await adminDeleteDrfQuestion(null, sectionId, question.id);
        onToast("Question removed");
      },
      () => setSections(previous),
    );
  }

  async function toggleQuestionEnabled(sectionId, question) {
    const nextEnabled = !question.enabled;
    const section = sections.find((entry) => entry.id === sectionId);
    if (nextEnabled && section) {
      const remaining = drfRemainingSectionPoints(section, { excludeId: question.id });
      if (Number(question.points) > remaining) {
        onToast(`Only ${remaining} pts are free in this section`);
        return;
      }
    }
    updateQuestionLocal(sectionId, question.id, { enabled: nextEnabled });
    await runImmediate(
      async () => {
        const updated = await adminUpdateDrfQuestion(null, sectionId, question.id, {
          enabled: nextEnabled,
        });
        updateQuestionLocal(sectionId, question.id, updated);
      },
      () => updateQuestionLocal(sectionId, question.id, { enabled: question.enabled }),
    );
  }

  async function toggleQuestionFixed(sectionId, question) {
    const nextFixed = !question.fixed;
    updateQuestionLocal(sectionId, question.id, { fixed: nextFixed });
    await runImmediate(
      async () => {
        const updated = await adminUpdateDrfQuestion(null, sectionId, question.id, {
          fixed: nextFixed,
        });
        updateQuestionLocal(sectionId, question.id, updated);
      },
      () => updateQuestionLocal(sectionId, question.id, { fixed: question.fixed }),
    );
  }

  if (loading) {
    return (
      <Panel title="Daily Reflection form · sections" subtitle="Loading DRF activity bank…">
        <p className="ua-cfg-launch-empty">Loading DRF config…</p>
      </Panel>
    );
  }

  return (
    <>
      <Panel
        className="ua-cfg-drf"
        title="Daily Reflection form · sections"
        subtitle="Section weights must total 100%, and the questions inside one section must total 100 points. Mark a section or question Fixed to lock its weightage against coach edits."
        actions={(
          <div className="ua-cfg-drf__head-actions">
            <span className={`ua-cfg-drf__allocated${weightTotal === 100 ? " is-full" : " is-warn"}`}>
              {weightTotal === 100 ? "100% allocated" : `${weightTotal}% allocated`}
            </span>
            <span className="ua-cfg-drf__live-count">{liveQuestions} of {totalQuestions} questions live</span>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setExpanded(new Set(sections.map((entry) => entry.id)))}>
              Expand all
            </button>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setExpanded(new Set())}>
              Collapse all
            </button>
          </div>
        )}
      >
        <div className="ua-cfg-drf-sections">
          {sections.map((section) => {
            const questions = section.questions ?? [];
            const isOpen = expanded.has(section.id);
            const pointsTotal = drfSectionPointsTotal({ ...section, questions }, { enabledOnly: true });
            const liveInSection = questions.filter((entry) => entry.enabled).length;
            const remainingPts = drfRemainingSectionPoints({ ...section, questions });
            const pointsValid = pointsTotal === 100;
            const draft = questionDrafts[section.id] ?? { name: "", points: "" };

            return (
              <article key={section.id} className={`ua-cfg-drf-section${isOpen ? " is-open" : ""}`}>
                <div className="ua-cfg-drf-section__head">
                  <button
                    type="button"
                    className="ua-cfg-drf-section__toggle"
                    aria-expanded={isOpen}
                    onClick={() => {
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(section.id)) next.delete(section.id);
                        else next.add(section.id);
                        return next;
                      });
                    }}
                  >
                    {isOpen ? "▾" : "▸"}
                  </button>
                  <input
                    type="text"
                    className="ua-cfg-drf-section__name"
                    value={section.name}
                    disabled={busy}
                    onChange={(event) => persistSection(section.id, { name: event.target.value })}
                  />
                  <div className="ua-cfg-drf-section__weight">
                    <span>Weight</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={section.weight}
                      disabled={section.fixed || busy}
                      onChange={(event) =>
                        persistSection(section.id, { weight: parseWeight(event.target.value) })
                      }
                    />
                    <span>%</span>
                  </div>
                  <span className={`ua-cfg-drf-section__meta${pointsValid ? "" : " is-invalid"}`}>
                    {liveInSection} of {questions.length} questions · {pointsTotal}/100 pts
                    {remainingPts > 0 ? ` · ${remainingPts} free` : ""}
                  </span>
                  <div className="ua-cfg-drf-section__controls">
                    <button
                      type="button"
                      className={`ua-cfg-drf-fix${section.fixed ? " is-on" : ""}`}
                      disabled={busy}
                      onClick={() => toggleSectionFixed(section)}
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
                      disabled={busy}
                      onClick={() => toggleSectionLive(section)}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn ua-cfg-drf-section__delete"
                      aria-label={`Remove ${section.name}`}
                      disabled={busy}
                      onClick={() => removeSection(section)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="ua-cfg-drf-section__body">
                    {questions.length ? (
                      questions.map((question, index) => (
                        <div key={question.id} className="ua-cfg-drf-question">
                          <span className="ua-cfg-drf-question__num">{index + 1}</span>
                          <input
                            type="text"
                            className="ua-cfg-drf-question__name"
                            value={question.name}
                            disabled={busy}
                            onChange={(event) =>
                              persistQuestion(section.id, question.id, { name: event.target.value })
                            }
                          />
                          <div className="ua-cfg-drf-question__points">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={question.points}
                              disabled={question.fixed || busy}
                              onChange={(event) =>
                                persistQuestionPoints(section, question, event.target.value)
                              }
                            />
                            <span>pts</span>
                          </div>
                          <div className="ua-cfg-drf-question__controls">
                            <button
                              type="button"
                              className={`ua-cfg-drf-fix${question.fixed ? " is-on" : ""}`}
                              disabled={busy}
                              onClick={() => toggleQuestionFixed(section.id, question)}
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
                              disabled={busy}
                              onClick={() => toggleQuestionEnabled(section.id, question)}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                            <button
                              type="button"
                              className="ua-cfg-icon-btn ua-cfg-drf-question__delete"
                              aria-label={`Remove ${question.name}`}
                              disabled={busy}
                              onClick={() => removeQuestion(section.id, question)}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="ua-cfg-launch-empty">No questions in this section yet.</p>
                    )}

                    <div className="ua-cfg-drf-add-q">
                      <input
                        type="text"
                        className="ua-cfg-drf-add-q__name"
                        placeholder="Add a question to this section…"
                        value={draft.name}
                        disabled={busy}
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
                        placeholder={remainingPts ? `Pts · ${remainingPts} left` : "0 left"}
                        value={draft.points}
                        disabled={busy || remainingPts <= 0}
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
                        disabled={busy || remainingPts <= 0}
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
            disabled={busy}
            onChange={(event) => setSectionDraft({ ...sectionDraft, name: event.target.value })}
          />
          <input
            type="text"
            inputMode="numeric"
            className="ua-cfg-drf-add-section__weight"
            placeholder="Weight %"
            value={sectionDraft.weight}
            disabled={busy}
            onChange={(event) => setSectionDraft({ ...sectionDraft, weight: event.target.value })}
          />
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            disabled={!remainingWeight || busy}
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
