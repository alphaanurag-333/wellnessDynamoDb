import { useMemo, useState } from "react";
import {
  launchDomainIsGeneral,
  launchDomainPointsTotal,
  launchLiveQuestionCount,
  launchRemainingWeight,
  launchScoredWeightTotal,
  launchTotalQuestionCount,
} from "../data/launchConfigData.js";

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

export function LaunchSection({ ratings, setRatings, domains, setDomains, onToast }) {
  const [expanded, setExpanded] = useState(() => new Set(domains.map((entry) => entry.id)));
  const [domainDraft, setDomainDraft] = useState({ name: "", weight: "" });
  const [questionDrafts, setQuestionDrafts] = useState({});
  const [ratingDraft, setRatingDraft] = useState({ name: "", points: "", description: "" });

  const weightTotal = useMemo(() => launchScoredWeightTotal(domains), [domains]);
  const liveQuestions = useMemo(() => launchLiveQuestionCount(domains), [domains]);
  const totalQuestions = useMemo(() => launchTotalQuestionCount(domains), [domains]);
  const remainingWeight = useMemo(() => launchRemainingWeight(domains), [domains]);

  function updateDomains(updater) {
    setDomains((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }

  function updateDomain(domainId, patch) {
    updateDomains((prev) =>
      prev.map((entry) => (entry.id === domainId ? { ...entry, ...patch } : entry)),
    );
  }

  function updateQuestion(domainId, questionId, patch) {
    updateDomains((prev) =>
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

  function updateRating(id, patch) {
    setRatings(ratings.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function addRating() {
    const name = ratingDraft.name.trim();
    const points = parsePoints(ratingDraft.points);
    const description = ratingDraft.description.trim();
    if (!name || !points || !description) {
      onToast("Rating name, points and description are required");
      return;
    }
    setRatings([
      ...ratings,
      {
        id: `rating-${Date.now()}`,
        badge: name,
        tone: "default",
        name,
        points,
        description,
      },
    ]);
    setRatingDraft({ name: "", points: "", description: "" });
    onToast(`${name} rating added`);
  }

  function addDomain() {
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
    const id = `domain-${Date.now()}`;
    updateDomains((prev) => [
      ...prev,
      { id, name, weight, live: true, fixed: false, questions: [] },
    ]);
    setExpanded((prev) => new Set([...prev, id]));
    setDomainDraft({ name: "", weight: "" });
    onToast(`${name} domain added`);
  }

  function addQuestion(domainId) {
    const draft = questionDrafts[domainId] ?? { name: "", points: "" };
    const name = draft.name.trim();
    const domain = domains.find((entry) => entry.id === domainId);
    const defaultPoints = launchDomainIsGeneral(domain) ? 10 : 6;
    const points = parsePoints(draft.points) || defaultPoints;
    if (!name) {
      onToast("Question text is required");
      return;
    }
    updateDomains((prev) =>
      prev.map((domain) =>
        domain.id === domainId
          ? {
              ...domain,
              questions: [
                ...domain.questions,
                {
                  id: `q-${Date.now()}`,
                  name,
                  points,
                  enabled: true,
                  fixed: false,
                  hasInfo: true,
                },
              ],
            }
          : domain,
      ),
    );
    setQuestionDrafts((prev) => ({ ...prev, [domainId]: { name: "", points: "" } }));
    onToast("Question added");
  }

  return (
    <>
      <Panel
        className="ua-cfg-launch-ratings"
        title="Rating scale"
        subtitle="Coaches pick one of these against every LAUNCH question — the points become that question's score, scaled to its weightage. This list also fills the 'i' scoring reference in User Management."
        actions={<span className="ua-cfg-launch-ratings__count">{ratings.length} ratings</span>}
      >
        <div className="ua-cfg-launch-ratings__list">
          {ratings.map((rating) => (
            <div key={rating.id} className={`ua-cfg-launch-rating is-${rating.tone}`}>
              <span className="ua-cfg-launch-rating__badge">{rating.badge}</span>
              <input
                type="text"
                className="ua-cfg-launch-rating__name"
                value={rating.name}
                onChange={(event) => updateRating(rating.id, { name: event.target.value, badge: event.target.value })}
              />
              <div className="ua-cfg-launch-rating__points">
                <input
                  type="text"
                  inputMode="numeric"
                  value={rating.points}
                  onChange={(event) => updateRating(rating.id, { points: parsePoints(event.target.value) })}
                />
                <span>pts</span>
              </div>
              <input
                type="text"
                className="ua-cfg-launch-rating__desc"
                value={rating.description}
                onChange={(event) => updateRating(rating.id, { description: event.target.value })}
              />
              <button
                type="button"
                className="ua-cfg-icon-btn ua-cfg-launch-rating__delete"
                aria-label={`Remove ${rating.name}`}
                onClick={() => {
                  setRatings(ratings.filter((entry) => entry.id !== rating.id));
                  onToast("Rating removed");
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="ua-cfg-launch-rating-add">
          <input
            type="text"
            placeholder="Rating name · e.g. Outstanding"
            value={ratingDraft.name}
            onChange={(event) => setRatingDraft({ ...ratingDraft, name: event.target.value })}
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Points"
            value={ratingDraft.points}
            onChange={(event) => setRatingDraft({ ...ratingDraft, points: event.target.value })}
          />
          <input
            type="text"
            placeholder="Description for coaches"
            value={ratingDraft.description}
            onChange={(event) => setRatingDraft({ ...ratingDraft, description: event.target.value })}
          />
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={addRating}>
            + Add rating
          </button>
        </div>
      </Panel>

      <Panel
        className="ua-cfg-drf ua-cfg-launch-domains"
        title="LAUNCH assessment · domains"
        subtitle="Domain weights must total 100%, and the questions inside one domain must total 100 points. Mark a domain or question Fixed to lock its weightage against coach edits."
        actions={(
          <div className="ua-cfg-drf__head-actions">
            <span className={`ua-cfg-drf__allocated${weightTotal === 100 ? " is-full" : ""}`}>
              {weightTotal === 100 ? "100% allocated" : `${weightTotal}% allocated`}
            </span>
            <span className="ua-cfg-drf__live-count">{liveQuestions} of {totalQuestions} questions live</span>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setExpanded(new Set(domains.map((entry) => entry.id)))}>
              Expand all
            </button>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setExpanded(new Set())}>
              Collapse all
            </button>
          </div>
        )}
      >
        <div className="ua-cfg-drf-sections">
          {domains.map((domain) => {
            const isOpen = expanded.has(domain.id);
            const pointsTotal = launchDomainPointsTotal(domain);
            const liveInDomain = domain.questions.filter((entry) => entry.enabled).length;
            const draft = questionDrafts[domain.id] ?? { name: "", points: "" };
            const isGeneral = launchDomainIsGeneral(domain);

            return (
              <article key={domain.id} className={`ua-cfg-drf-section${isOpen ? " is-open" : ""}`}>
                <div className="ua-cfg-drf-section__head">
                  <button
                    type="button"
                    className="ua-cfg-drf-section__toggle"
                    aria-expanded={isOpen}
                    onClick={() => {
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(domain.id)) next.delete(domain.id);
                        else next.add(domain.id);
                        return next;
                      });
                    }}
                  >
                    {isOpen ? "▾" : "▸"}
                  </button>
                  <input
                    type="text"
                    className="ua-cfg-drf-section__name"
                    value={domain.name}
                    onChange={(event) => updateDomain(domain.id, { name: event.target.value })}
                  />
                  <div className="ua-cfg-drf-section__weight">
                    <span>Weight</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={domain.weight}
                      disabled={domain.fixed}
                      onChange={(event) =>
                        updateDomain(domain.id, { weight: parseWeight(event.target.value) })
                      }
                    />
                    <span>%</span>
                  </div>
                  <span className="ua-cfg-drf-section__meta ua-cfg-launch-domain__meta">
                    <span className="ua-cfg-launch-domain__stats">
                      {liveInDomain} of {domain.questions.length} questions · {pointsTotal}/100 pts
                    </span>
                    {isGeneral ? (
                      <span className="ua-cfg-launch-general-badge">General · unscored</span>
                    ) : null}
                  </span>
                  <div className="ua-cfg-drf-section__controls">
                    <button
                      type="button"
                      className={`ua-cfg-drf-fix${domain.fixed ? " is-on" : ""}`}
                      onClick={() => updateDomain(domain.id, { fixed: !domain.fixed })}
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
                      onClick={() => updateDomain(domain.id, { live: !domain.live })}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn ua-cfg-drf-section__delete"
                      aria-label={`Remove ${domain.name}`}
                      onClick={() => {
                        updateDomains((prev) => prev.filter((entry) => entry.id !== domain.id));
                        onToast(`${domain.name} removed`);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="ua-cfg-drf-section__body">
                    {domain.questions.length ? (
                      domain.questions.map((question, index) => (
                        <div key={question.id} className="ua-cfg-launch-question ua-cfg-drf-question">
                          <span className="ua-cfg-drf-question__num">{index + 1}</span>
                          <input
                            type="text"
                            className="ua-cfg-drf-question__name"
                            value={question.name}
                            onChange={(event) =>
                              updateQuestion(domain.id, question.id, { name: event.target.value })
                            }
                          />
                          <div className="ua-cfg-launch-question__controls">
                            <button
                              type="button"
                              className="ua-cfg-launch-info"
                              onClick={() => onToast("Scoring info opened")}
                            >
                              Info
                            </button>
                            <div className="ua-cfg-drf-question__points">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={question.points}
                                disabled={question.fixed}
                                onChange={(event) =>
                                  updateQuestion(domain.id, question.id, {
                                    points: parsePoints(event.target.value),
                                  })
                                }
                              />
                              <span>pts</span>
                            </div>
                            <button
                              type="button"
                              className={`ua-cfg-drf-fix${question.fixed ? " is-on" : ""}`}
                              onClick={() =>
                                updateQuestion(domain.id, question.id, { fixed: !question.fixed })
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
                                updateQuestion(domain.id, question.id, { enabled: !question.enabled })
                              }
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                            <button
                              type="button"
                              className="ua-cfg-icon-btn ua-cfg-drf-question__delete"
                              aria-label={`Remove ${question.name}`}
                              onClick={() => {
                                updateDomains((prev) =>
                                  prev.map((entry) =>
                                    entry.id === domain.id
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
                        placeholder="Pts"
                        value={draft.points}
                        onChange={(event) =>
                          setQuestionDrafts((prev) => ({
                            ...prev,
                            [domain.id]: { ...draft, points: event.target.value },
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
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
        title="Add a domain"
        subtitle={`Scored domains share the 100% — a new one can only take the weight that is still free (${remainingWeight}% available). Leave the weight at 0 for a general, unscored section (name, age, occupation and the like).`}
      >
        <div className="ua-cfg-drf-add-section">
          <input
            type="text"
            className="ua-cfg-drf-add-section__name"
            placeholder="Domain name · e.g. Gut Health"
            value={domainDraft.name}
            onChange={(event) => setDomainDraft({ ...domainDraft, name: event.target.value })}
          />
          <input
            type="text"
            inputMode="numeric"
            className="ua-cfg-drf-add-section__weight"
            placeholder="Weight % · 0 = general"
            value={domainDraft.weight}
            onChange={(event) => setDomainDraft({ ...domainDraft, weight: event.target.value })}
          />
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addDomain}>
            + Add domain
          </button>
        </div>
      </Panel>
    </>
  );
}

export {
  LAUNCH_CONFIG_DOMAINS,
  LAUNCH_CONFIG_RATINGS,
} from "../data/launchConfigData.js";
