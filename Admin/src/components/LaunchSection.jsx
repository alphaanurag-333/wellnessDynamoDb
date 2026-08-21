import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateLaunchDomain,
  adminCreateLaunchQuestion,
  adminCreateLaunchRating,
  adminDeleteLaunchDomain,
  adminDeleteLaunchQuestion,
  adminDeleteLaunchRating,
  adminGetLaunchConfig,
  adminUpdateLaunchDomain,
  adminUpdateLaunchQuestion,
  adminUpdateLaunchRating,
} from "../api/launchConfigApi.js";
import {
  launchDomainIsGeneral,
  launchDomainPointsTotal,
  launchLiveQuestionCount,
  launchRemainingDomainPoints,
  launchRemainingWeight,
  launchScoredWeightTotal,
  launchScoringHint,
  launchTotalQuestionCount,
} from "../data/launchConfigData.js";

function Panel({ title, subtitle, actions, children, className = "" }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section  className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
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

function ScoringInfoModal({ open, ratings, onClose }) {
  if (!open) return null;
  const maxRating = ratings.reduce((max, row) => Math.max(max, Number(row.points) || 0), 0) || 100;
  const sample = ratings.find((row) => row.tone === "good") || ratings[1] || ratings[0];
  const samplePts = Number(sample?.points) || 75;
  const sampleEarned = Math.round(((samplePts / maxRating) * 7) * 100) / 100;
  return (
    <div className="ua-cfg-launch-info-modal" role="dialog" aria-labelledby="launch-scoring-title" onClick={onClose}>
      <div className="ua-cfg-launch-info-modal__card" onClick={(event) => event.stopPropagation()}>
        <div className="ua-cfg-launch-info-modal__head">
          <h4 id="launch-scoring-title">Scoring reference</h4>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close scoring info" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="ua-cfg-launch-info-modal__hint">{launchScoringHint(ratings)}</p>
        <ul className="ua-cfg-launch-info-modal__ratings">
          {ratings.map((rating) => (
            <li key={rating.id} className={`is-${rating.tone}`}>
              <strong>{rating.name}</strong>
              <span>{rating.points} / {maxRating} pts</span>
              <em>{rating.description}</em>
            </li>
          ))}
        </ul>
        <p className="ua-cfg-launch-info-modal__formula">
          Example: {sample?.name || "Good"} ({samplePts} pts) on a 7-pt question → {sampleEarned} earned.
        </p>
      </div>
    </div>
  );
}

export function LaunchSection({ ratings, setRatings, domains, setDomains, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [domainDraft, setDomainDraft] = useState({ name: "", weight: "" });
  const [questionDrafts, setQuestionDrafts] = useState({});
  const [ratingDraft, setRatingDraft] = useState({ name: "", points: "", description: "" });
  const [infoOpen, setInfoOpen] = useState(false);
  const ratingsRef = useRef(ratings);
  const domainsRef = useRef(domains);
  const persistTimers = useRef({});

  useEffect(() => {
    ratingsRef.current = ratings;
  }, [ratings]);

  useEffect(() => {
    domainsRef.current = domains;
  }, [domains]);

  useEffect(() => () => {
    Object.values(persistTimers.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const weightTotal = useMemo(() => launchScoredWeightTotal(domains), [domains]);
  const liveQuestions = useMemo(() => launchLiveQuestionCount(domains), [domains]);
  const totalQuestions = useMemo(() => launchTotalQuestionCount(domains), [domains]);
  const remainingWeight = useMemo(() => launchRemainingWeight(domains), [domains]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetLaunchConfig(null);
      setRatings(data.ratings);
      setDomains(data.domains);
      setExpanded(new Set(data.domains.map((entry) => entry.id)));
    } catch (error) {
      onToast(error?.message || "Failed to load LAUNCH config");
      setRatings([]);
      setDomains([]);
    } finally {
      setLoading(false);
    }
  }, [onToast, setDomains, setRatings]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  function schedulePersist(key, fn) {
    window.clearTimeout(persistTimers.current[key]);
    persistTimers.current[key] = window.setTimeout(() => {
      fn().catch((error) => {
        onToast(error?.message || "Failed to save LAUNCH config");
        loadConfig();
      });
    }, 450);
  }

  function updateRatingLocal(id, patch) {
    setRatings((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function updateDomainLocal(domainId, patch) {
    setDomains((prev) =>
      prev.map((entry) => (entry.id === domainId ? { ...entry, ...patch } : entry)),
    );
  }

  function updateQuestionLocal(domainId, questionId, patch) {
    setDomains((prev) =>
      prev.map((domain) =>
        domain.id === domainId
          ? {
              ...domain,
              questions: domain.questions.map((entry) =>
                entry.id === questionId ? { ...entry, ...patch } : entry,
              ),
            }
          : domain,
      ),
    );
  }

  function persistRating(id, patch) {
    updateRatingLocal(id, patch);
    schedulePersist(`rating:${id}:${Object.keys(patch).join(",")}`, async () => {
      const updated = await adminUpdateLaunchRating(null, id, patch);
      setRatings((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry)));
    });
  }

  function persistDomain(domainId, patch) {
    updateDomainLocal(domainId, patch);
    schedulePersist(`domain:${domainId}:${Object.keys(patch).join(",")}`, async () => {
      const updated = await adminUpdateLaunchDomain(null, domainId, patch);
      setDomains((prev) =>
        prev.map((entry) => (entry.id === domainId ? { ...entry, ...updated } : entry)),
      );
    });
  }

  function persistQuestion(domainId, questionId, patch) {
    updateQuestionLocal(domainId, questionId, patch);
    schedulePersist(`question:${domainId}:${questionId}:${Object.keys(patch).join(",")}`, async () => {
      const updated = await adminUpdateLaunchQuestion(null, domainId, questionId, patch);
      updateQuestionLocal(domainId, questionId, updated);
    });
  }

  function persistQuestionPoints(domain, question, rawValue) {
    const parsed = parsePoints(rawValue);
    const remaining = launchRemainingDomainPoints(domain, { excludeId: question.id });
    const nextPoints =
      !launchDomainIsGeneral(domain) && question.enabled ? Math.min(parsed, remaining) : parsed;
    if (nextPoints !== parsed) {
      onToast(`Only ${remaining} pts are free in this domain`);
    }
    persistQuestion(domain.id, question.id, { points: nextPoints });
  }

  async function runImmediate(action, rollback) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      if (rollback) rollback();
      onToast(error?.message || "Failed to save LAUNCH config");
    } finally {
      setBusy(false);
    }
  }

  async function addRating() {
    const name = ratingDraft.name.trim();
    const points = parsePoints(ratingDraft.points);
    const description = ratingDraft.description.trim();
    if (!name || !points || !description) {
      onToast("Rating name, points and description are required");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateLaunchRating(null, { name, points, description });
      setRatings((prev) => [...prev, created]);
      setRatingDraft({ name: "", points: "", description: "" });
      onToast(`${name} rating added`);
    } catch (error) {
      onToast(error?.message || "Failed to add rating");
    } finally {
      setBusy(false);
    }
  }

  async function removeRating(rating) {
    const previous = ratingsRef.current;
    setRatings((prev) => prev.filter((entry) => entry.id !== rating.id));
    await runImmediate(
      async () => {
        await adminDeleteLaunchRating(null, rating.id);
        onToast("Rating removed");
      },
      () => setRatings(previous),
    );
  }

  async function addDomain() {
    const name = domainDraft.name.trim();
    const weight = parseWeight(domainDraft.weight);
    if (!name) {
      onToast("Domain name is required");
      return;
    }
    if (weight > remainingWeight) {
      onToast(`Only ${remainingWeight}% weight is free`);
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateLaunchDomain(null, { name, weight, live: true });
      setDomains((prev) => [...prev, { ...created, questions: created.questions || [] }]);
      setExpanded((prev) => new Set([...prev, created.id]));
      setDomainDraft({ name: "", weight: "" });
      onToast(`${name} domain added`);
    } catch (error) {
      onToast(error?.message || "Failed to add domain");
    } finally {
      setBusy(false);
    }
  }

  async function removeDomain(domain) {
    const previous = domainsRef.current;
    setDomains((prev) => prev.filter((entry) => entry.id !== domain.id));
    await runImmediate(
      async () => {
        await adminDeleteLaunchDomain(null, domain.id);
        onToast(`${domain.name} removed`);
      },
      () => setDomains(previous),
    );
  }

  async function toggleDomainLive(domain) {
    const nextLive = !domain.live;
    updateDomainLocal(domain.id, { live: nextLive });
    await runImmediate(
      async () => {
        const updated = await adminUpdateLaunchDomain(null, domain.id, { live: nextLive });
        setDomains((prev) =>
          prev.map((entry) => (entry.id === domain.id ? { ...entry, ...updated } : entry)),
        );
      },
      () => updateDomainLocal(domain.id, { live: domain.live }),
    );
  }

  async function toggleDomainFixed(domain) {
    const nextFixed = !domain.fixed;
    updateDomainLocal(domain.id, { fixed: nextFixed });
    await runImmediate(
      async () => {
        const updated = await adminUpdateLaunchDomain(null, domain.id, { fixed: nextFixed });
        setDomains((prev) =>
          prev.map((entry) => (entry.id === domain.id ? { ...entry, ...updated } : entry)),
        );
      },
      () => updateDomainLocal(domain.id, { fixed: domain.fixed }),
    );
  }

  async function addQuestion(domainId) {
    const draft = questionDrafts[domainId] ?? { name: "", points: "" };
    const name = draft.name.trim();
    const domain = domains.find((entry) => entry.id === domainId);
    const isGeneral = launchDomainIsGeneral(domain);
    const remaining = launchRemainingDomainPoints(domain);
    if (!name) {
      onToast("Question text is required");
      return;
    }
    if (!isGeneral && remaining <= 0) {
      onToast("This domain already has 100 points. Lower a question's pts first.");
      return;
    }
    const defaultPoints = isGeneral ? 10 : Math.min(6, remaining) || remaining;
    const requested = parsePoints(draft.points) || defaultPoints;
    const points = isGeneral ? requested : Math.min(requested, remaining);
    if (!isGeneral && requested > remaining) {
      onToast(`Only ${remaining} pts are free in this domain`);
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateLaunchQuestion(null, domainId, { name, points, enabled: true });
      setDomains((prev) =>
        prev.map((entry) =>
          entry.id === domainId
            ? { ...entry, questions: [...(entry.questions || []), created] }
            : entry,
        ),
      );
      setQuestionDrafts((prev) => ({ ...prev, [domainId]: { name: "", points: "" } }));
      onToast("Question added");
    } catch (error) {
      onToast(error?.message || "Failed to add question");
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestion(domainId, question) {
    const previous = domainsRef.current;
    setDomains((prev) =>
      prev.map((entry) =>
        entry.id === domainId
          ? { ...entry, questions: entry.questions.filter((row) => row.id !== question.id) }
          : entry,
      ),
    );
    await runImmediate(
      async () => {
        await adminDeleteLaunchQuestion(null, domainId, question.id);
        onToast("Question removed");
      },
      () => setDomains(previous),
    );
  }

  async function toggleQuestionEnabled(domainId, question) {
    const nextEnabled = !question.enabled;
    const domain = domains.find((entry) => entry.id === domainId);
    if (nextEnabled && domain && !launchDomainIsGeneral(domain)) {
      const remaining = launchRemainingDomainPoints(domain, { excludeId: question.id });
      if (Number(question.points) > remaining) {
        onToast(`Only ${remaining} pts are free in this domain`);
        return;
      }
    }
    updateQuestionLocal(domainId, question.id, { enabled: nextEnabled });
    await runImmediate(
      async () => {
        const updated = await adminUpdateLaunchQuestion(null, domainId, question.id, {
          enabled: nextEnabled,
        });
        updateQuestionLocal(domainId, question.id, updated);
      },
      () => updateQuestionLocal(domainId, question.id, { enabled: question.enabled }),
    );
  }

  async function toggleQuestionFixed(domainId, question) {
    const nextFixed = !question.fixed;
    updateQuestionLocal(domainId, question.id, { fixed: nextFixed });
    await runImmediate(
      async () => {
        const updated = await adminUpdateLaunchQuestion(null, domainId, question.id, {
          fixed: nextFixed,
        });
        updateQuestionLocal(domainId, question.id, updated);
      },
      () => updateQuestionLocal(domainId, question.id, { fixed: question.fixed }),
    );
  }

  if (loading) {
    return (
      <Panel title="LAUNCH assessment" subtitle="Loading rating scale and domains…">
        <p className="ua-cfg-launch-empty">Loading LAUNCH config…</p>
      </Panel>
    );
  }

  return (
    <>
      <Panel
        className="ua-cfg-launch-ratings"
        title="Rating scale"
        subtitle="Coaches pick one of these against every LAUNCH question — the points become that question's score, scaled to its weightage. This list also fills the scoring reference in User Management."
        actions={<span className="ua-cfg-launch-ratings__count">{ratings.length} ratings</span>}
      >
        <div className="ua-cfg-launch-ratings__list">
          {ratings.map((rating) => (
            <div key={rating.id} className={`ua-cfg-launch-rating is-${rating.tone}`}>
              <span  className="ua-cfg-launch-rating__badge" style={{width: "85px"}}>{rating.badge}</span>
              <input
                type="text"
                className="ua-cfg-launch-rating__name"
                value={rating.name}
                disabled={busy}
                onChange={(event) =>
                  persistRating(rating.id, { name: event.target.value, badge: event.target.value })
                }
              />
              <div className="ua-cfg-launch-rating__points">
                <input
                  type="text"
                  inputMode="numeric"
                  value={rating.points}
                  disabled={busy}
                  onChange={(event) =>
                    persistRating(rating.id, { points: parsePoints(event.target.value) })
                  }
                />
                <span>pts</span>
              </div>
              <input
                type="text"
                className="ua-cfg-launch-rating__desc"
                value={rating.description}
                disabled={busy}
                onChange={(event) =>
                  persistRating(rating.id, { description: event.target.value })
                }
              />
              <button
                type="button"
                className="ua-cfg-icon-btn ua-cfg-launch-rating__delete"
                aria-label={`Remove ${rating.name}`}
                disabled={busy}
                onClick={() => removeRating(rating)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="ua-cfg-launch-rating-add" height="30px">
          <input
            type="text"
            placeholder="Rating name · e.g. Outstanding"
            value={ratingDraft.name}
            disabled={busy}
            onChange={(event) => setRatingDraft({ ...ratingDraft, name: event.target.value })}
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Points"
            value={ratingDraft.points}
            disabled={busy}
            onChange={(event) => setRatingDraft({ ...ratingDraft, points: event.target.value })}
          />
          <input
            type="text"
            placeholder="Description for coaches"
            value={ratingDraft.description}
            disabled={busy}
            onChange={(event) => setRatingDraft({ ...ratingDraft, description: event.target.value })}
          />
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={addRating}>
            + Add rating
          </button>
        </div>
      </Panel>

      <Panel
        className="ua-cfg-drf ua-cfg-launch-domains"
        title={(
          <>
            LAUNCH assessment · domains
            <span className={`ua-cfg-drf__allocated${weightTotal === 100 ? " is-full" : " is-warn"}`}>
              {weightTotal === 100 ? "100% allocated" : `${weightTotal}% allocated`}
            </span>
          </>
        )}
        subtitle="Domain weights must total 100%, and the questions inside one domain must total 100 points. Mark a domain or question Fixed to lock its weightage against coach edits."
        actions={(
          <div className="ua-cfg-drf__head-actions">
            <span className="ua-cfg-drf__live-count">{liveQuestions} of {totalQuestions} questions live</span>
            <button style={{color:"rgb(90, 107, 133)"}} type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setExpanded(new Set(domains.map((entry) => entry.id)))}>
              Expand all
            </button>
            <button style={{color:"rgb(90, 107, 133)"}} type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setExpanded(new Set())}>
              Collapse all
            </button>
          </div>
        )}
      >
        <div className="ua-cfg-drf-sections">
          {domains.map((domain) => {
            const isOpen = expanded.has(domain.id);
            const questions = domain.questions ?? [];
            const pointsTotal = launchDomainPointsTotal({ ...domain, questions }, { enabledOnly: true });
            const liveInDomain = questions.filter((entry) => entry.enabled).length;
            const draft = questionDrafts[domain.id] ?? { name: "", points: "" };
            const isGeneral = launchDomainIsGeneral(domain);
            const remainingPts = launchRemainingDomainPoints({ ...domain, questions });
            const pointsValid = isGeneral || pointsTotal === 100;

            return (
              <article key={domain.id} className={`ua-cfg-drf-section${isOpen ? " is-open" : ""}`}>
                <div className="ua-cfg-drf-section__head">
                  <button
                    type="button"
                    className="ua-cfg-drf-section__toggle"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? `Collapse ${domain.name}` : `Expand ${domain.name}`}
                    onClick={() => {
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(domain.id)) next.delete(domain.id);
                        else next.add(domain.id);
                        return next;
                      });
                    }}
                  >
                    <svg viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M3 4.5 6 8l3-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    className="ua-cfg-drf-section__name"
                    value={domain.name}
                    disabled={busy}
                    onChange={(event) => persistDomain(domain.id, { name: event.target.value })}
                  />
                  <div className="ua-cfg-launch-domain__trail">
                    <div className="ua-cfg-drf-section__weight">
                      <span>Weight</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={domain.weight}
                        disabled={domain.fixed || busy}
                        onChange={(event) =>
                          persistDomain(domain.id, { weight: parseWeight(event.target.value) })
                        }
                      />
                      <span>%</span>
                    </div>
                    <span className={`ua-cfg-drf-section__meta ua-cfg-launch-domain__meta${pointsValid ? "" : " is-invalid"}`}>
                      <span className="ua-cfg-launch-domain__stats">
                        {liveInDomain} of {questions.length} questions · {pointsTotal}/100 pts
                        {!isGeneral && remainingPts > 0 ? ` · ${remainingPts} free` : ""}
                      </span>
                      {isGeneral ? (
                        <span className="ua-cfg-launch-general-badge">General · unscored</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className={`ua-cfg-drf-fix${domain.fixed ? " is-on" : ""}`}
                      disabled={busy}
                      onClick={() => toggleDomainFixed(domain)}
                    >
                      Fix
                    </button>
                    <span className={`ua-cfg-drf-status${domain.live ? " is-on" : ""}`}>
                      {domain.live ? "Live" : "Off"}
                    </span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${domain.live ? " ua-toggle--on" : ""}`}
                      aria-pressed={domain.live}
                      disabled={busy}
                      onClick={() => toggleDomainLive(domain)}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn ua-cfg-drf-section__delete"
                      aria-label={`Remove ${domain.name}`}
                      disabled={busy}
                      onClick={() => removeDomain(domain)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="ua-cfg-drf-section__body">
                    {questions.length ? (
                      questions.map((question, index) => (
                        <div key={question.id} className="ua-cfg-drf-question ua-cfg-launch-question">
                          <span className="ua-cfg-drf-question__num">{index + 1}</span>
                          <input
                            type="text"
                            className="ua-cfg-drf-question__name"
                            value={question.name}
                            disabled={busy}
                            onChange={(event) =>
                              persistQuestion(domain.id, question.id, { name: event.target.value })
                            }
                          />
                          <div className="ua-cfg-launch-question__trail">
                            <button
                              type="button"
                              className="ua-cfg-launch-info"
                              onClick={() => setInfoOpen(true)}
                            >
                              Info
                            </button>
                            <div className="ua-cfg-drf-question__points">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={question.points}
                                disabled={question.fixed || busy}
                                onChange={(event) =>
                                  persistQuestionPoints(domain, question, event.target.value)
                                }
                              />
                              <span>pts</span>
                            </div>
                            <button
                              type="button"
                              className={`ua-cfg-drf-fix${question.fixed ? " is-on" : ""}`}
                              disabled={busy}
                              onClick={() => toggleQuestionFixed(domain.id, question)}
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
                              onClick={() => toggleQuestionEnabled(domain.id, question)}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                            <button
                              type="button"
                              className="ua-cfg-icon-btn ua-cfg-drf-question__delete"
                              aria-label={`Remove ${question.name}`}
                              disabled={busy}
                              onClick={() => removeQuestion(domain.id, question)}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="ua-cfg-launch-empty">No questions in this domain yet.</p>
                    )}

                    <div className="ua-cfg-drf-add-q">
                      <input
                        type="text"
                        className="ua-cfg-drf-add-q__name"
                        placeholder="Add a question to this domain…"
                        value={draft.name}
                        disabled={busy}
                        onChange={(event) =>
                          setQuestionDrafts((prev) => ({
                            ...prev,
                            [domain.id]: { ...draft, name: event.target.value },
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") addQuestion(domain.id);
                        }}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        className="ua-cfg-drf-add-q__pts"
                        placeholder={isGeneral ? "Pts" : remainingPts ? `Pts · ${remainingPts} left` : "0 left"}
                        value={draft.points}
                        disabled={busy || (!isGeneral && remainingPts <= 0)}
                        onChange={(event) =>
                          setQuestionDrafts((prev) => ({
                            ...prev,
                            [domain.id]: { ...draft, points: event.target.value },
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-drf-add-q__btn"
                        disabled={busy || (!isGeneral && remainingPts <= 0)}
                        onClick={() => addQuestion(domain.id)}
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
        className="ua-cfg-drf"
        title="Add a domain"
        subtitle={`Scored domains share the 100% — a new one can only take the weight that is still free (${remainingWeight}% available). Leave the weight at 0 for a general, unscored section (name, age, occupation and the like).`}
      >
        <div className="ua-cfg-drf-add-section">
          <input
            type="text"
            className="ua-cfg-drf-add-section__name"
            placeholder="Domain name · e.g. Gut Health"
            value={domainDraft.name}
            disabled={busy}
            onChange={(event) => setDomainDraft({ ...domainDraft, name: event.target.value })}
          />
          <input
            type="text"
            inputMode="numeric"
            className="ua-cfg-drf-add-section__weight"
            placeholder="Weight % · 0 = general"
            value={domainDraft.weight}
            disabled={busy}
            onChange={(event) => setDomainDraft({ ...domainDraft, weight: event.target.value })}
          />
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={addDomain}>
            + Add domain
          </button>
        </div>
      </Panel>

      <ScoringInfoModal open={infoOpen} ratings={ratings} onClose={() => setInfoOpen(false)} />
    </>
  );
}

export {
  LAUNCH_CONFIG_DOMAINS,
  LAUNCH_CONFIG_RATINGS,
} from "../data/launchConfigData.js";
