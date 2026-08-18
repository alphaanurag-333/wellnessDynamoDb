import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PillTabs } from "../shared.jsx";
import {
  LAUNCH_DOMAINS,
  LAUNCH_LIFESTYLE,
  LAUNCH_PRAKRITI,
  RATING_OPTIONS,
  RATING_SCORES,
  suggestRating,
} from "../../data/launchData.js";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal.jsx";
import { ScoringReferenceModal } from "./ScoringReferenceModal.jsx";
import {
  createOnboardingMeetingSlots,
  fetchLaunchFocusAreas,
  fetchOnboardingMeetings,
  fetchUserLaunchAssessments,
  saveUserLaunchAssessment,
} from "../../api/onboardingApi.js";

function LaunchHeader() {
  return (
    <div className="ua-cp-launch-head">
      <h2 className="ua-cp-launch-head__title">LAUNCH</h2>
      <p className="ua-cp-launch-head__sub">
        Lifestyle Assessment &amp; Understanding of Nutrition, Constitution &amp; Health
      </p>
    </div>
  );
}

function ScoreCard({ lifestyle }) {
  return (
    <div className="ua-cp-launch-score">
      <div>
        <span className="ua-cp-launch-score__label">Final life score</span>
        <span className="ua-cp-launch-score__pts">{lifestyle.points} / {lifestyle.maxPoints} points</span>
      </div>
      <div className="ua-cp-launch-score__val">
        <strong>{lifestyle.finalScore}</strong>
        <span>/ 10</span>
      </div>
    </div>
  );
}

function PrakritiCard({ prakriti }) {
  const max = 10;
  return (
    <div className="ua-cp-launch-prakriti-card">
      <div className="ua-cp-launch-prakriti-card__top">
        <div>
          <span className="ua-cp-launch-prakriti-card__label">Your prakṛti</span>
          <strong>{prakriti.dominant}</strong>
        </div>
        <span className="ua-cp-launch-prakriti-card__elements">{prakriti.elements}</span>
      </div>
      <div className="ua-cp-launch-prakriti-card__bars">
        {[
          { key: "vata", label: "Vāta", tone: "blue", val: prakriti.scores.vata },
          { key: "pitta", label: "Pitta", tone: "orange", val: prakriti.scores.pitta },
          { key: "kapha", label: "Kapha", tone: "green", val: prakriti.scores.kapha },
        ].map((d) => (
          <div key={d.key} className="ua-cp-launch-prakriti-bar">
            <span className={`ua-cp-launch-prakriti-bar__dot ua-cp-launch-prakriti-bar__dot--${d.tone}`} />
            <span className="ua-cp-launch-prakriti-bar__label">{d.label}</span>
            <div className="ua-cp-launch-prakriti-bar__track">
              <span className={`ua-cp-launch-prakriti-bar__fill ua-cp-launch-prakriti-bar__fill--${d.tone}`} style={{ width: `${(d.val / max) * 100}%` }} />
            </div>
            <span className="ua-cp-launch-prakriti-bar__val">{d.val} / {max}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttemptControls({ attempt, historyCount, historyOpen, onToggleHistory, onRerun, rerunLabel = "Re-run assessment" }) {
  return (
    <div className="ua-cp-launch-controls">
      <span className="ua-cp-launch-controls__attempt">Attempt {attempt}</span>
      <button type="button" className="ua-cp-launch-controls__btn" onClick={onToggleHistory}>
        {historyOpen ? `Hide history · ${historyCount}` : `History · ${historyCount}`}
      </button>
      <button type="button" className="ua-cp-launch-controls__rerun" onClick={onRerun}>
        <span className="ua-cp-launch-controls__rerun-icon" aria-hidden="true">↻</span>
        {rerunLabel}
      </button>
    </div>
  );
}

function HistoryTable({ rows, footnote, variant = "lifestyle" }) {
  return (
    <div className={`ua-cp-launch-history${variant === "prakriti" ? " ua-cp-launch-history--prakriti" : ""}`}>
      {rows.map((r) => (
        <div key={r.attempt} className="ua-cp-launch-history__row">
          <span className="ua-cp-launch-history__attempt">Attempt {r.attempt}</span>
          <strong className={`ua-cp-launch-history__score${variant === "prakriti" ? " ua-cp-launch-history__type" : ""}`}>{r.score ?? r.type}</strong>
          <span className="ua-cp-launch-history__pts">{r.points ?? r.scores}</span>
          <span className={`ua-cp-launch-history__role ua-cp-launch-history__role--${r.role === "ADMIN" ? "admin" : "coach"}`}>{r.role === "ADMIN" ? "ADMIN" : "WELLNESS COACH"}</span>
          <span className="ua-cp-launch-history__by">{r.by}</span>
          <span className="ua-cp-launch-history__date">{r.date}</span>
        </div>
      ))}
      {footnote ? <p className="ua-cp-launch-history__foot">{footnote}</p> : null}
    </div>
  );
}

function DomainAccordion({
  domain,
  open,
  onToggle,
  ratings,
  scores,
  replies,
  onRate,
  onScoreChange,
  onReplyChange,
  onOpenScoring,
}) {
  const pct = Math.round((domain.score / domain.max) * 100);
  return (
    <div className={`ua-cp-launch-domain${open ? " ua-cp-launch-domain--open" : ""}`}>
      <button type="button" className="ua-cp-launch-domain__head" onClick={onToggle}>
        <div className="ua-cp-launch-domain__subhead"> <span className="ua-cp-launch-domain__chev">{open ? "▾" : "▸"}</span>
          <span className="ua-cp-launch-domain__num">{domain.num}</span>
          <strong className="ua-cp-launch-domain__title">{domain.title}</strong></div>

        <div className="ua-cp-launch-domain__subhead">
          <span className="ua-cp-launch-domain__meta">{domain.questions} questions</span>
          <div className="ua-cp-launch-domain__bar-wrap">
            <div className="ua-cp-launch-domain__bar"><span style={{ width: `${pct}%` }} /></div>
          </div>
          <span className="ua-cp-launch-domain__score">{domain.score} / {domain.max}</span> </div>
      </button>
      {open && domain.items.length ? (
        <div className="ua-cp-launch-questions">
          <div className="ua-cp-launch-qtable-wrap">
            <table className="ua-cp-launch-qtable">
              <thead>
                <tr>
                  <th className="ua-cp-launch-qtable__col-q">Question</th>
                  <th className="ua-cp-launch-qtable__col-reply">User reply · coach notes</th>
                  <th className="ua-cp-launch-qtable__col-rating">Coach rating</th>
                  <th className="ua-cp-launch-qtable__col-weight">Weightage</th>
                </tr>
              </thead>
              <tbody>
                {domain.items.map((item, i) => {
                  const key = `${domain.id}-${i}`;
                  const rating = ratings[key] ?? item.rating;
                  const score = scores[key] ?? item.score;
                  const reply = replies[key] ?? item.reply;
                  return (
                    <tr key={key}>
                      <td className="ua-cp-launch-qtable__q" data-label="Question">
                        <span className="ua-cp-launch-qtable__n">{i + 1}.</span>
                        <span className="ua-cp-launch-qtable__q-text">{item.q}</span>
                        <button
                          type="button"
                          className="ua-cp-launch-qtable__info"
                          onClick={() => onOpenScoring({
                            key,
                            question: item.q,
                            reply,
                          })}
                          aria-label="Open scoring reference"
                        >
                          i
                        </button>
                      </td>
                      <td className="ua-cp-launch-qtable__reply" data-label="User reply · coach notes">
                        <input
                          className="ua-cp-launch-qtable__input"
                          value={reply}
                          onChange={(e) => onReplyChange(key, e.target.value)}
                          placeholder="User reply or coach notes…"
                          aria-label={`Reply for question ${i + 1}`}
                        />
                        {reply.trim() ? (
                          <span className="ua-cp-launch-qtable__reply-note">Noted by coach</span>
                        ) : null}
                      </td>
                      <td className="ua-cp-launch-qtable__rating" data-label="Coach rating">
                        <div className="ua-cp-launch-ratings">
                          {RATING_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              className={`ua-cp-launch-rating ua-cp-launch-rating--${opt.tone}${rating === opt.id ? " ua-cp-launch-rating--active" : ""}`}
                              onClick={() => onRate(key, opt.id)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <div className="ua-cp-launch-qtable__score-row">
                          <span className="ua-cp-launch-qtable__score-label">Score</span>
                          <input
                            className="ua-cp-launch-qtable__score"
                            value={score}
                            onChange={(e) => onScoreChange(key, e.target.value)}
                            aria-label={`Score for question ${i + 1}`}
                          />
                          <span className="ua-cp-launch-qtable__score-max">/ 100</span>
                        </div>
                      </td>
                      <td className="ua-cp-launch-qtable__weight" data-label="Weightage">
                        <span>{item.weight}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FocusAreas({ onToast }) {
  const [points, setPoints] = useState([]);
  const [point, setPoint] = useState("");

  function addPoint() {
    const trimmed = point.trim();
    if (!trimmed) return;
    setPoints((list) => [...list, trimmed]);
    setPoint("");
    onToast("Focus point added");
  }

  function removePoint(index) {
    setPoints((list) => list.filter((_, i) => i !== index));
    onToast("Focus point removed");
  }

  return (
    <div className="ua-cp-launch-focus">
      <div className="ua-cp-launch-focus__head">
        <span className="ua-cp-launch-focus__title">✓ Areas to focus</span>
        <span className="ua-cp-launch-focus__sub">Domains scoring under 50% are flagged automatically. Add or remove points as needed.</span>
      </div>
      {points.length ? (
        <div className="ua-cp-launch-focus__list">
          {points.map((item, index) => (
            <div key={`${item}-${index}`} className="ua-cp-launch-focus__item">
              <span className="ua-cp-launch-focus__bullet" aria-hidden="true" />
              <span className="ua-cp-launch-focus__text">{item}</span>
              <button type="button" className="ua-cp-launch-focus__remove" onClick={() => removePoint(index)} aria-label="Remove focus point">×</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="ua-cp-launch-focus__empty">No focus areas — all domains are above 50%.</div>
      )}
      <div className="ua-cp-launch-focus__add">
        <input
          type="text"
          placeholder="Add a focus point…"
          value={point}
          onChange={(e) => setPoint(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addPoint(); }}
        />
        <button type="button" className="ua-cp-launch-focus__add-btn" onClick={addPoint}>Add point</button>
      </div>
    </div>
  );
}

function DoshaColumn({ dosha, onToggle }) {
  return (
    <div className={`ua-cp-launch-dosha ua-cp-launch-dosha--${dosha.tone}`}>
      <div className="ua-cp-launch-dosha__head">
        <span className="ua-cp-launch-dosha__letter">{dosha.letter}</span>
        <div className="ua-cp-launch-dosha__meta">
          <strong>{dosha.name}</strong>
          <span>{dosha.sub}</span>
        </div>
        <span className="ua-cp-launch-dosha__score">
          <strong>{dosha.score}</strong>
          <span>/10</span>
        </span>
      </div>
      <div className="ua-cp-launch-dosha__list">
        {dosha.statements.map((s) => (
          <label key={s.text} className="ua-cp-launch-dosha__item">
            <input
              type="checkbox"
              className="ua-cp-launch-dosha__input"
              checked={s.checked}
              onChange={() => onToggle(dosha.id, s.text)}
            />
            <span className={`ua-cp-launch-dosha__check${s.checked ? " ua-cp-launch-dosha__check--on" : ""}`} aria-hidden="true">
              {s.checked ? "✓" : ""}
            </span>
            <span className="ua-cp-launch-dosha__text">{s.text}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function GuidanceColumn({ title, sub, tag, tone, items, addLabel, onToast }) {
  const [list, setList] = useState(items);

  function addItem() {
    setList((l) => [...l, "New point"]);
    onToast(`${addLabel} added`);
  }

  function updateItem(index, value) {
    setList((l) => l.map((item, i) => (i === index ? value : item)));
  }

  function removeItem(index) {
    setList((l) => l.filter((_, i) => i !== index));
    onToast("Item removed");
  }

  return (
    <div className={`ua-cp-launch-guide ua-cp-launch-guide--${tone}`}>
      <div className="ua-cp-launch-guide__head">
        <div>
          <strong>{title}</strong>
          <span>{sub}</span>
        </div>
        {tag ? <span className="ua-cp-launch-guide__tag">{tag}</span> : null}
      </div>
      <div className="ua-cp-launch-guide__list">
        {list.map((item, index) => (
          <div key={`${item}-${index}`} className="ua-cp-launch-guide__item">
            <span className={`ua-cp-launch-guide__bullet ua-cp-launch-guide__bullet--${tone}`} />
            <input
              type="text"
              className="ua-cp-launch-guide__input"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              aria-label={`${title} item ${index + 1}`}
            />
            <button type="button" className="ua-cp-launch-guide__remove" onClick={() => removeItem(index)} aria-label="Remove">×</button>
          </div>
        ))}
      </div>
      <button type="button" className={`ua-cp-launch-guide__add ua-cp-launch-guide__add--${tone}`} onClick={addItem}>
        + {addLabel}
      </button>
    </div>
  );
}

function LifestyleTab({ onToast }) {
  const [lifestyle, setLifestyle] = useState(LAUNCH_LIFESTYLE);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [openDomains, setOpenDomains] = useState(() => new Set(["gut"]));
  const [ratings, setRatings] = useState({});
  const [scores, setScores] = useState({});
  const [replies, setReplies] = useState({});
  const [scoringRef, setScoringRef] = useState(null);

  function handleRate(key, ratingId) {
    setRatings((r) => ({ ...r, [key]: ratingId }));
    setScores((s) => ({ ...s, [key]: RATING_SCORES[ratingId] }));
  }

  function handleUseSuggestedRating() {
    if (!scoringRef) return;
    const suggested = suggestRating(scoringRef.question, scoringRef.reply);
    handleRate(scoringRef.key, suggested);
    setScoringRef(null);
  }

  function expandAll() {
    setOpenDomains(new Set(LAUNCH_DOMAINS.map((d) => d.id)));
  }

  function collapseAll() {
    setOpenDomains(new Set());
  }

  function rerunAssessment() {
    setLifestyle((prev) => ({
      ...prev,
      attempt: prev.attempt + 1,
      history: [
        {
          attempt: prev.attempt,
          score: prev.finalScore,
          points: `${prev.points} / ${prev.maxPoints} points`,
          role: "ADMIN",
          by: "Admin desk",
          date: "22 Jul 2026",
        },
        ...prev.history,
      ],
    }));
    setHistoryOpen(true);
    onToast("Assessment re-run started · previous attempt archived");
  }

  return (
    <>
      <div className="ua-cp-launch-hero">
        <ScoreCard lifestyle={lifestyle} />
        <AttemptControls
          attempt={lifestyle.attempt}
          historyCount={lifestyle.history.length}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((o) => !o)}
          onRerun={rerunAssessment}
        />
        {historyOpen ? (
          <HistoryTable
            rows={lifestyle.history}
            footnote="Every re-run archives the previous result. Nothing is overwritten."
          />
        ) : null}
      </div>
      <div className="ua-cp-launch-domains-toolbar">
        <button type="button" className="ua-cp-launch-questions__expand-btn" onClick={expandAll}>Expand all</button>
        <button type="button" className="ua-cp-launch-questions__expand-btn" onClick={collapseAll}>Collapse all</button>
      </div>
      {LAUNCH_DOMAINS.map((d) => (
        <DomainAccordion
          key={d.id}
          domain={d}
          open={openDomains.has(d.id)}
          onToggle={() => setOpenDomains((cur) => {
            const next = new Set(cur);
            if (next.has(d.id)) next.delete(d.id);
            else next.add(d.id);
            return next;
          })}
          ratings={ratings}
          scores={scores}
          replies={replies}
          onRate={handleRate}
          onScoreChange={(key, val) => setScores((s) => ({ ...s, [key]: val }))}
          onReplyChange={(key, val) => setReplies((r) => ({ ...r, [key]: val }))}
          onOpenScoring={setScoringRef}
        />
      ))}
      <FocusAreas onToast={onToast} />
      {scoringRef ? (
        <ScoringReferenceModal
          question={scoringRef.question}
          reply={scoringRef.reply}
          suggestedRating={suggestRating(scoringRef.question, scoringRef.reply)}
          onUseSuggested={handleUseSuggestedRating}
          onClose={() => setScoringRef(null)}
        />
      ) : null}
    </>
  );
}

function PrakritiTab({ onToast }) {
  const [prakriti, setPrakriti] = useState(LAUNCH_PRAKRITI);
  const [historyOpen, setHistoryOpen] = useState(false);

  function toggleStatement(doshaId, text) {
    setPrakriti((prev) => {
      const doshas = prev.doshas.map((d) => {
        if (d.id !== doshaId) return d;
        const statements = d.statements.map((s) => (
          s.text === text ? { ...s, checked: !s.checked } : s
        ));
        return { ...d, statements, score: statements.filter((s) => s.checked).length };
      });
      const scores = {
        vata: doshas.find((d) => d.id === "vata")?.score ?? prev.scores.vata,
        pitta: doshas.find((d) => d.id === "pitta")?.score ?? prev.scores.pitta,
        kapha: doshas.find((d) => d.id === "kapha")?.score ?? prev.scores.kapha,
      };
      const ranked = [...doshas].sort((a, b) => b.score - a.score);
      const top = ranked[0];
      const second = ranked[1];
      const dominant = top.score === second.score && second.score > 0
        ? `${top.name}-${second.name}`
        : top.name;
      return { ...prev, doshas, scores, dominant };
    });
  }

  function rerunAssessment() {
    setPrakriti((prev) => ({
      ...prev,
      attempt: prev.attempt + 1,
      history: [
        {
          attempt: prev.attempt,
          type: prev.dominant,
          scores: `V ${prev.scores.vata} · P ${prev.scores.pitta} · K ${prev.scores.kapha}`,
          role: "ADMIN",
          by: "Admin desk",
          date: "22 Jul 2026",
        },
        ...prev.history,
      ],
    }));
    setHistoryOpen(true);
    onToast("Assessment re-run started · previous attempt archived");
  }

  return (
    <div className="ua-cp-launch-prakriti-body">
      <p className="ua-cp-launch-prakriti-hint">
        Tick the statements that describe the client. The dosha with the most ticks is their dominant Prakṛti.
      </p>
      <div className="ua-cp-launch-hero ua-cp-launch-hero--narrow">
        <PrakritiCard prakriti={prakriti} />
        <AttemptControls
          attempt={prakriti.attempt}
          historyCount={prakriti.history.length}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((o) => !o)}
          onRerun={rerunAssessment}
        />
        {historyOpen ? (
          <HistoryTable
            rows={prakriti.history}
            variant="prakriti"
            footnote="Every re-run archives the previous result. Nothing is overwritten."
          />
        ) : null}
      </div>
      <div className="ua-cp-launch-dosha-grid">
        {prakriti.doshas.map((d) => (
          <DoshaColumn key={d.id} dosha={d} onToggle={toggleStatement} />
        ))}
      </div>
      <div className="ua-cp-launch-guide-grid">
        <GuidanceColumn
          title="Recommendations"
          sub="Diet & lifestyle guidance suited to this Prakṛti."
          tag="FOR PITTA"
          tone="rec"
          items={prakriti.recommendations}
          addLabel="Add recommendation"
          onToast={onToast}
        />
        <GuidanceColumn
          title="Things to avoid"
          sub="Foods & habits that aggravate this Prakṛti."
          tone="avoid"
          items={prakriti.avoid}
          addLabel="Add item"
          onToast={onToast}
        />
      </div>
    </div>
  );
}

export function LaunchSection({ user, onToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") === "prakriti" ? "prakriti" : "lifestyle";
  const [tab, setTab] = useState(tabFromUrl);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [launchMeeting, setLaunchMeeting] = useState(null);
  const [score, setScore] = useState("");
  const [focusAreas, setFocusAreas] = useState([]);
  const [selectedFocus, setSelectedFocus] = useState([]);
  const [latestScore, setLatestScore] = useState(null);
  const [savingScore, setSavingScore] = useState(false);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || /^\d+$/.test(String(userId))) return undefined;
    fetchLaunchFocusAreas(userId)
      .then((rows) => setFocusAreas(Array.isArray(rows) ? rows : rows?.focusAreas || []))
      .catch(() => {});
    fetchUserLaunchAssessments(userId)
      .then((data) => {
        const list = data?.assessments || data?.items || [];
        const latest = list[0];
        if (latest) setLatestScore(latest.totalScore);
      })
      .catch(() => {});
    fetchOnboardingMeetings(userId)
      .then((rows) => {
        const meeting = (rows || []).find((row) => (
          row.stepKey === "launch"
          && ["slots_offered", "time_requested"].includes(row.status)
        ));
        setLaunchMeeting(meeting || null);
      })
      .catch(() => {});
    return undefined;
  }, [user?.id]);

  function handleTabChange(next) {
    setTab(next);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("section", "launch");
      if (next === "prakriti") p.set("tab", "prakriti");
      else p.delete("tab");
      return p;
    }, { replace: true });
  }

  return (
    <div className={`ua-cp-section ua-cp-launch${tab === "prakriti" ? " ua-cp-launch--prakriti" : " ua-cp-launch--lifestyle"}`}>
      <div className="ua-cp-launch-top">
        <LaunchHeader />
        <PillTabs
          size="md"
          active={tab}
          onChange={handleTabChange}
          tabs={[
            { id: "lifestyle", label: "Lifestyle score" },
            { id: "prakriti", label: "Prakriti type" },
          ]}
        />
        <div className="ua-cp-launch-schedule-wrap">
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--launch-schedule" onClick={() => setScheduleOpen(true)}>
            📅 Schedule LAUNCH meeting
          </button>
        </div>
      </div>
      {tab === "lifestyle" ? (
        <div>
          <div className="ua-cp-launch-score ua-cp-launch-score--save">
            <div className="ua-cp-launch-score__copy">
              <span className="ua-cp-launch-score__label">Save LAUNCH score from this meeting</span>
              {latestScore != null ? <span className="ua-cp-launch-score__pts">Latest {latestScore}</span> : null}
            </div>
            <div className="ua-cp-launch-score__actions">
              <input
                type="number"
                min="0"
                max="750"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Total score"
                className="ua-cp-launch-score__input"
              />
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm"
                disabled={savingScore || score === ""}
                onClick={async () => {
                  try {
                    setSavingScore(true);
                    await saveUserLaunchAssessment(user.id, {
                      assessmentDate: new Date().toISOString().slice(0, 10),
                      totalScore: Number(score),
                      focusAreaIds: selectedFocus,
                    });
                    setLatestScore(Number(score));
                    onToast("LAUNCH score saved");
                  } catch (err) {
                    onToast(err?.message || "Failed to save LAUNCH score");
                  } finally {
                    setSavingScore(false);
                  }
                }}
              >
                Save score
              </button>
            </div>
          </div>
          {focusAreas.length ? (
            <div className="ua-cp-ip-history__markers" style={{ marginBottom: 16 }}>
              {focusAreas.map((area) => {
                const id = area.id || area._id;
                const active = selectedFocus.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`ua-cp-ip-marker${active ? " ua-cp-ip-badge--green" : ""}`}
                    onClick={() => setSelectedFocus((prev) => (
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    ))}
                  >
                    {area.title || area.name || id}
                  </button>
                );
              })}
            </div>
          ) : null}
          <LifestyleTab onToast={onToast} />
        </div>
      ) : <PrakritiTab onToast={onToast} />}
      {scheduleOpen ? (
        <ScheduleMeetingModal
          user={user}
          title="Schedule LAUNCH meeting"
          defaultNote="We will walk through your LAUNCH results together."
          defaultDuration={60}
          existingMeeting={launchMeeting}
          onClose={() => setScheduleOpen(false)}
          onSend={async (payload) => {
            try {
              const meeting = await createOnboardingMeetingSlots(user.id, {
                stepKey: "launch",
                slots: (payload?.slots || []).map((s) => ({ startAt: s.startAt, endAt: s.endAt })),
                note: payload?.note,
                hold: payload?.hold,
                durationMinutes: payload?.duration,
              });
              setLaunchMeeting(meeting || null);
              onToast("LAUNCH meeting slots sent");
              setScheduleOpen(false);
            } catch (err) {
              onToast(err?.message || "Failed to send slots");
            }
          }}
        />
      ) : null}
    </div>
  );
}
