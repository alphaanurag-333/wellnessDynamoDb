import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PillTabs } from "../shared.jsx";
import { suggestRating } from "../../data/launchData.js";
import { computeLaunchAssessment } from "../../data/launchConfigData.js";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal.jsx";
import { ScoringReferenceModal } from "./ScoringReferenceModal.jsx";
import {
  createOnboardingMeetingSlots,
  fetchLaunchAssessmentConfig,
  fetchLaunchFocusAreas,
  fetchOnboardingMeetings,
  fetchPrakrutiQuestions,
  fetchPrakrutiRecommendations,
  fetchPrakrutiThingsToAvoid,
  fetchUserLaunchAssessments,
  fetchUserPrakrutiAssessment,
  saveUserLaunchAssessment,
  saveUserPrakrutiAssessment,
  updateUserLaunchAssessment,
} from "../../api/onboardingApi.js";

const DOSHA_KEYS = ["vata", "pitta", "kapha"];
const DOSHA_META = {
  vata: { letter: "V", name: "Vāta", sub: "AIR + SPACE", tone: "blue", elements: "Air + Space" },
  pitta: { letter: "P", name: "Pitta", sub: "FIRE + WATER", tone: "orange", elements: "Fire + Water" },
  kapha: { letter: "K", name: "Kapha", sub: "EARTH + WATER", tone: "green", elements: "Earth + Water" },
};
const PRAKRITI_ELEMENTS = {
  vata: "Air + Space",
  pitta: "Fire + Water",
  kapha: "Earth + Water",
  vata_pitta: "Air + Fire",
  pitta_kapha: "Fire + Earth",
  kapha_vata: "Earth + Air",
  sama_prakriti: "Balanced",
};

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

function formatLaunchDate(value) {
  const raw = String(value || "");
  if (!raw) return "";
  const d = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function historyRole(role) {
  const r = String(role || "").toLowerCase();
  if (r.includes("admin")) return "ADMIN";
  return "COACH";
}

function toLifeScore(totalScore) {
  const n = Number(totalScore) || 0;
  if (n <= 10) return n;
  return Math.round(n) / 10;
}

function assessmentsToHistory(list) {
  return [...(list || [])]
    .sort((a, b) => String(b.assessmentDate || b.updatedAt || "").localeCompare(String(a.assessmentDate || a.updatedAt || "")))
    .map((row, index, arr) => ({
      attempt: arr.length - index,
      score: toLifeScore(row.totalScore),
      points: `${Number(row.totalScore) || 0} / 100 points`,
      role: historyRole(row.createdByRole),
      by: historyRole(row.createdByRole) === "ADMIN" ? "Admin desk" : "Wellness coach",
      date: formatLaunchDate(row.updatedAt || row.assessmentDate),
    }));
}

function ratingIdForTone(ratings, tone) {
  const match = (ratings || []).find((row) => row.tone === tone || row.id === tone);
  return match?.id || ratings?.[ratings.length - 1]?.id || "";
}

function ScoreCard({ overall, maxOverall, finalScore }) {
  return (
    <div className="ua-cp-launch-score">
      <div>
        <span className="ua-cp-launch-score__label">Final life score</span>
        <span className="ua-cp-launch-score__pts">{overall} / {maxOverall} points</span>
      </div>
      <div className="ua-cp-launch-score__val">
        <strong>{finalScore}</strong>
        <span>/ 10</span>
      </div>
    </div>
  );
}

function PrakritiCard({ prakriti }) {
  const max = Math.max(10, ...Object.values(prakriti.scores || {}), 1);
  const showBars = prakriti.scores && (prakriti.scores.vata || prakriti.scores.pitta || prakriti.scores.kapha);
  return (
    <div className="ua-cp-launch-prakriti-card">
      <div className="ua-cp-launch-prakriti-card__top">
        <div>
          <span className="ua-cp-launch-prakriti-card__label">Your prakṛti</span>
          <strong>{prakriti.dominant || "—"}</strong>
        </div>
        <span className="ua-cp-launch-prakriti-card__elements">{prakriti.elements || ""}</span>
      </div>
      {showBars ? (
        <div className="ua-cp-launch-prakriti-card__bars">
          {[
            { key: "vata", label: "Vāta", tone: "blue", val: prakriti.scores.vata || 0 },
            { key: "pitta", label: "Pitta", tone: "orange", val: prakriti.scores.pitta || 0 },
            { key: "kapha", label: "Kapha", tone: "green", val: prakriti.scores.kapha || 0 },
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
      ) : null}
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
      {onRerun ? (
        <button type="button" className="ua-cp-launch-controls__rerun" onClick={onRerun}>
          <span className="ua-cp-launch-controls__rerun-icon" aria-hidden="true">↻</span>
          {rerunLabel}
        </button>
      ) : null}
    </div>
  );
}

function HistoryTable({ rows, footnote, variant = "lifestyle" }) {
  if (!rows.length) {
    return <p className="ua-cp-launch-history__foot">No previous attempts yet.</p>;
  }
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
  ratingOptions,
  replies,
  onRate,
  onReplyChange,
  onOpenScoring,
}) {
  const pct = domain.max ? Math.round((domain.score / domain.max) * 100) : 0;
  return (
    <div className={`ua-cp-launch-domain${open ? " ua-cp-launch-domain--open" : ""}`}>
      <button type="button" className="ua-cp-launch-domain__head" onClick={onToggle}>
        <div className="ua-cp-launch-domain__subhead">
          <span className="ua-cp-launch-domain__chev">{open ? "▾" : "▸"}</span>
          <span className="ua-cp-launch-domain__num">{domain.num}</span>
          <strong className="ua-cp-launch-domain__title">{domain.title}</strong>
        </div>
        <div className="ua-cp-launch-domain__subhead">
          <span className="ua-cp-launch-domain__meta">
            {domain.questions} questions{domain.weight ? ` · ${domain.weight}%` : ""}
          </span>
          <div className="ua-cp-launch-domain__bar-wrap">
            <div className="ua-cp-launch-domain__bar"><span style={{ width: `${pct}%` }} /></div>
          </div>
          <span className="ua-cp-launch-domain__score">{domain.score} / {domain.max}</span>
        </div>
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
                  const rating = ratings[item.id] ?? item.ratingId;
                  const reply = replies[item.id] ?? "";
                  return (
                    <tr key={item.id}>
                      <td className="ua-cp-launch-qtable__q" data-label="Question">
                        <span className="ua-cp-launch-qtable__n">{i + 1}.</span>
                        <span className="ua-cp-launch-qtable__q-text">{item.q}</span>
                        {item.hasInfo ? (
                          <button
                            type="button"
                            className="ua-cp-launch-qtable__info"
                            onClick={() => onOpenScoring({
                              key: item.id,
                              question: item.q,
                              reply,
                            })}
                            aria-label="Open scoring reference"
                          >
                            i
                          </button>
                        ) : null}
                      </td>
                      <td className="ua-cp-launch-qtable__reply" data-label="User reply · coach notes">
                        <input
                          className="ua-cp-launch-qtable__input"
                          value={reply}
                          onChange={(e) => onReplyChange(item.id, e.target.value)}
                          placeholder="User reply or coach notes…"
                          aria-label={`Reply for question ${i + 1}`}
                        />
                        {reply.trim() ? (
                          <span className="ua-cp-launch-qtable__reply-note">Noted by coach</span>
                        ) : null}
                      </td>
                      <td className="ua-cp-launch-qtable__rating" data-label="Coach rating">
                        <div className="ua-cp-launch-ratings">
                          {ratingOptions.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              className={`ua-cp-launch-rating ua-cp-launch-rating--${opt.tone || "default"}${rating === opt.id ? " ua-cp-launch-rating--active" : ""}`}
                              onClick={() => onRate(item.id, opt.id)}
                            >
                              {opt.name || opt.label}
                            </button>
                          ))}
                        </div>
                        <div className="ua-cp-launch-qtable__score-row">
                          <span className="ua-cp-launch-qtable__score-label">Score</span>
                          <span className="ua-cp-launch-qtable__score">{item.earned}</span>
                          <span className="ua-cp-launch-qtable__score-max">/ {item.points}</span>
                        </div>
                      </td>
                      <td className="ua-cp-launch-qtable__weight" data-label="Weightage">
                        <span>{item.points}</span>
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

function FocusAreas({ autoPoints, catalog, selectedFocus, onToggleFocus, extraPoints, onAddPoint, onRemovePoint, onToast }) {
  const [point, setPoint] = useState("");
  const merged = [...autoPoints, ...extraPoints];

  function addPoint() {
    const trimmed = point.trim();
    if (!trimmed) return;
    onAddPoint(trimmed);
    setPoint("");
    onToast("Focus point added");
  }

  return (
    <div className="ua-cp-launch-focus">
      <div className="ua-cp-launch-focus__head">
        <span className="ua-cp-launch-focus__title">✓ Areas to focus</span>
        <span className="ua-cp-launch-focus__sub">Domains scoring under 50% are flagged automatically. Add or remove points as needed.</span>
      </div>
      {merged.length ? (
        <div className="ua-cp-launch-focus__list">
          {merged.map((item, index) => (
            <div key={`${item}-${index}`} className="ua-cp-launch-focus__item">
              <span className="ua-cp-launch-focus__bullet" aria-hidden="true" />
              <span className="ua-cp-launch-focus__text">{item}</span>
              {index >= autoPoints.length ? (
                <button type="button" className="ua-cp-launch-focus__remove" onClick={() => onRemovePoint(index - autoPoints.length)} aria-label="Remove focus point">×</button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="ua-cp-launch-focus__empty">No focus areas — all domains are above 50%.</div>
      )}
      {catalog.length ? (
        <div className="ua-cp-ip-history__markers" style={{ marginTop: 12, marginBottom: 8 }}>
          {catalog.map((area) => {
            const id = area.id || area._id;
            const active = selectedFocus.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`ua-cp-ip-marker${active ? " ua-cp-ip-badge--green" : ""}`}
                onClick={() => onToggleFocus(id)}
              >
                {area.title || area.name || id}
              </button>
            );
          })}
        </div>
      ) : null}
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
          <span>/{dosha.max || 10}</span>
        </span>
      </div>
      <div className="ua-cp-launch-dosha__list">
        {dosha.statements.map((s) => (
          <label key={s.id || s.text} className="ua-cp-launch-dosha__item">
            <input
              type="checkbox"
              className="ua-cp-launch-dosha__input"
              checked={s.checked}
              onChange={() => onToggle(dosha.id, s.id || s.text)}
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

function categoryKey(category) {
  const raw = String(category || "").trim().toLowerCase();
  if (raw.includes("vata")) return "vata";
  if (raw.includes("pitta")) return "pitta";
  if (raw.includes("kapha")) return "kapha";
  return raw || "general";
}

function isDoshaCatalog(questions) {
  const keys = new Set((questions || []).map((q) => categoryKey(q.category)));
  return DOSHA_KEYS.every((k) => keys.has(k));
}

function typeFromDoshaScores(scores) {
  const ranked = DOSHA_KEYS
    .map((key) => ({ key, score: Number(scores[key]) || 0 }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const second = ranked[1];
  if (!top || top.score <= 0) return "";
  if (ranked.every((row) => row.score === top.score)) return "sama_prakriti";
  if (second && top.score === second.score) {
    const pair = [top.key, second.key].sort().join("_");
    if (pair === "pitta_vata") return "vata_pitta";
    if (pair === "kapha_pitta") return "pitta_kapha";
    if (pair === "kapha_vata") return "kapha_vata";
  }
  return top.key;
}

function LifestyleTab({
  user,
  onToast,
  config,
  loading,
  assessments,
  onAssessmentsChange,
  focusAreas,
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [openDomains, setOpenDomains] = useState(() => new Set());
  const [ratings, setRatings] = useState({});
  const [replies, setReplies] = useState({});
  const [scoringRef, setScoringRef] = useState(null);
  const [selectedFocus, setSelectedFocus] = useState([]);
  const [extraPoints, setExtraPoints] = useState([]);
  const [saving, setSaving] = useState(false);

  const ratingOptions = config.ratings || [];
  const totals = useMemo(
    () => computeLaunchAssessment({
      domains: config.domains || [],
      ratings: ratingOptions,
      ratingByQuestion: ratings,
    }),
    [config.domains, ratingOptions, ratings],
  );

  const history = assessmentsToHistory(assessments);
  const attempt = Math.max(history.length, assessments.length, 0) || (assessments.length ? assessments.length : 0);
  const latest = assessments[0];

  useEffect(() => {
    const first = (totals.domainRows || []).find((d) => d.items.length);
    if (first) setOpenDomains((cur) => (cur.size ? cur : new Set([first.id])));
  }, [totals.domainRows]);

  useEffect(() => {
    const answers = latest?.answers;
    if (!Array.isArray(answers) || !answers.length) return;
    const nextRatings = {};
    const nextReplies = {};
    answers.forEach((row) => {
      if (row.questionId && row.ratingId) nextRatings[row.questionId] = row.ratingId;
      if (row.questionId && row.reply) nextReplies[row.questionId] = row.reply;
    });
    setRatings(nextRatings);
    setReplies(nextReplies);
    if (Array.isArray(latest?.focusAreaIds)) setSelectedFocus(latest.focusAreaIds);
  }, [latest]);

  const autoPoints = totals.domainRows
    .filter((d) => !d.general && d.max && (d.score / d.max) < 0.5)
    .map((d) => `${d.title} is below 50% (${d.score} / ${d.max})`);

  function handleRate(questionId, ratingId) {
    setRatings((r) => ({ ...r, [questionId]: ratingId }));
  }

  function handleUseSuggestedRating() {
    if (!scoringRef) return;
    const tone = suggestRating(scoringRef.question, scoringRef.reply);
    const ratingId = ratingIdForTone(ratingOptions, tone);
    if (ratingId) handleRate(scoringRef.key, ratingId);
    setScoringRef(null);
  }

  function expandAll() {
    setOpenDomains(new Set(totals.domainRows.map((d) => d.id)));
  }

  function collapseAll() {
    setOpenDomains(new Set());
  }

  function rerunAssessment() {
    setRatings({});
    setReplies({});
    setHistoryOpen(true);
    onToast("New attempt started · previous result stays in history");
  }

  async function saveAssessment() {
    const userId = user?.id;
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      assessmentDate: today,
      totalScore: Math.round(totals.overall),
      focusAreaIds: selectedFocus,
      answers: Object.keys({ ...ratings, ...replies }).map((questionId) => ({
        questionId,
        ratingId: ratings[questionId] || "",
        reply: replies[questionId] || "",
      })),
    };
    try {
      setSaving(true);
      const existingToday = (assessments || []).find((row) => row.assessmentDate === today);
      const saved = existingToday
        ? await updateUserLaunchAssessment(userId, existingToday.id, payload)
        : await saveUserLaunchAssessment(userId, payload);
      const next = [
        saved,
        ...(assessments || []).filter((row) => row.id !== saved.id),
      ];
      onAssessmentsChange(next);
      onToast("LAUNCH assessment saved");
    } catch (err) {
      onToast(err?.message || "Failed to save LAUNCH assessment");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="ua-cp-launch-prakriti-hint">Loading LAUNCH config…</p>;
  }

  if (!totals.domainRows.length) {
    return (
      <p className="ua-cp-launch-prakriti-hint">
        No live LAUNCH domains yet. Add them in Configs → LAUNCH.
      </p>
    );
  }

  if (!ratingOptions.length) {
    return (
      <p className="ua-cp-launch-prakriti-hint">
        LAUNCH ratings are missing. Add Excellent / Good / Fair / Poor in Configs → LAUNCH.
      </p>
    );
  }

  return (
    <>
      <div className="ua-cp-launch-hero">
        <ScoreCard overall={totals.overall} maxOverall={totals.maxOverall} finalScore={totals.finalScore} />
        <AttemptControls
          attempt={attempt || 1}
          historyCount={history.length}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((o) => !o)}
          onRerun={rerunAssessment}
        />
        {historyOpen ? (
          <HistoryTable
            rows={history}
            footnote="Every save archives the result. Re-run starts a fresh scoring pass."
          />
        ) : null}
      </div>
      <div className="ua-cp-launch-score" style={{ marginBottom: 16 }}>
        <div>
          <span className="ua-cp-launch-score__label">Save this attempt from Configs → LAUNCH scoring</span>
          {latest != null ? <span className="ua-cp-launch-score__pts">Latest {latest.totalScore}</span> : null}
        </div>
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm"
          disabled={saving}
          onClick={saveAssessment}
        >
          {saving ? "Saving…" : "Save assessment"}
        </button>
      </div>
      <div className="ua-cp-launch-domains-toolbar">
        <button type="button" className="ua-cp-launch-questions__expand-btn" onClick={expandAll}>Expand all</button>
        <button type="button" className="ua-cp-launch-questions__expand-btn" onClick={collapseAll}>Collapse all</button>
      </div>
      {totals.domainRows.map((d) => (
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
          ratingOptions={ratingOptions}
          replies={replies}
          onRate={handleRate}
          onReplyChange={(key, val) => setReplies((r) => ({ ...r, [key]: val }))}
          onOpenScoring={setScoringRef}
        />
      ))}
      <FocusAreas
        autoPoints={autoPoints}
        catalog={focusAreas}
        selectedFocus={selectedFocus}
        onToggleFocus={(id) => setSelectedFocus((prev) => (
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        ))}
        extraPoints={extraPoints}
        onAddPoint={(item) => setExtraPoints((list) => [...list, item])}
        onRemovePoint={(index) => setExtraPoints((list) => list.filter((_, i) => i !== index))}
        onToast={onToast}
      />
      {scoringRef ? (
        <ScoringReferenceModal
          question={scoringRef.question}
          reply={scoringRef.reply}
          suggestedRating={suggestRating(scoringRef.question, scoringRef.reply)}
          ratings={ratingOptions}
          onUseSuggested={handleUseSuggestedRating}
          onClose={() => setScoringRef(null)}
        />
      ) : null}
    </>
  );
}

function PrakritiTab({ user, onToast }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [types, setTypes] = useState([]);
  const [thingsToAvoid, setThingsToAvoid] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedAvoid, setSelectedAvoid] = useState([]);
  const [checked, setChecked] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const doshaMode = isDoshaCatalog(questions);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || /^\d+$/.test(String(userId))) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchPrakrutiQuestions(userId),
      fetchPrakrutiThingsToAvoid(userId),
      fetchUserPrakrutiAssessment(userId),
    ])
      .then(([qs, avoid, data]) => {
        if (cancelled) return;
        setQuestions(Array.isArray(qs) ? qs : []);
        setThingsToAvoid(Array.isArray(avoid) ? avoid : []);
        setTypes(data?.prakrutiTypes || []);
        setAssessment(data?.assessment || null);
        setHistoryRows(Array.isArray(data?.history) ? data.history : []);
        const type = data?.assessment?.prakrutiType || "";
        setSelectedType(type);
        setSelectedAvoid(data?.assessment?.thingToAvoidIds || []);
      })
      .catch((err) => {
        if (!cancelled) onToast(err?.message || "Failed to load Prakriti config");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || !selectedType) {
      setRecommendations([]);
      return undefined;
    }
    let cancelled = false;
    fetchPrakrutiRecommendations(userId, selectedType)
      .then((rows) => { if (!cancelled) setRecommendations(rows || []); })
      .catch(() => { if (!cancelled) setRecommendations([]); });
    return () => { cancelled = true; };
  }, [user?.id, selectedType]);

  const doshas = useMemo(() => {
    if (!doshaMode) return [];
    return DOSHA_KEYS.map((id) => {
      const statements = questions
        .filter((q) => categoryKey(q.category) === id)
        .map((q) => ({
          id: q.id,
          text: q.question || q.name,
          checked: Boolean(checked[q.id]),
        }));
      return {
        id,
        ...DOSHA_META[id],
        statements,
        score: statements.filter((s) => s.checked).length,
        max: statements.length || 10,
      };
    });
  }, [checked, doshaMode, questions]);

  const scores = {
    vata: doshas.find((d) => d.id === "vata")?.score || 0,
    pitta: doshas.find((d) => d.id === "pitta")?.score || 0,
    kapha: doshas.find((d) => d.id === "kapha")?.score || 0,
  };

  const inferredType = doshaMode ? typeFromDoshaScores(scores) : selectedType;
  const activeType = selectedType || inferredType;
  const typeLabel = types.find((t) => t.value === activeType)?.label
    || DOSHA_META[activeType]?.name
    || activeType
    || "—";

  const groupedQuestions = useMemo(() => {
    const groups = new Map();
    questions.forEach((q) => {
      const key = q.category || "General";
      const list = groups.get(key) || [];
      list.push(q);
      groups.set(key, list);
    });
    return [...groups.entries()];
  }, [questions]);

  const history = [...historyRows]
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .map((row, index, arr) => ({
      attempt: arr.length - index,
      type: row.prakrutiTypeLabel || row.prakrutiType,
      scores: (row.thingsToAvoidTitles || []).slice(0, 2).join(" · ") || "—",
      role: historyRole(row.createdByRole),
      by: historyRole(row.createdByRole) === "ADMIN" ? "Admin desk" : "Wellness coach",
      date: formatLaunchDate(row.updatedAt || row.createdAt),
    }));

  function toggleStatement(doshaId, statementId) {
    setChecked((prev) => {
      const next = { ...prev, [statementId]: !prev[statementId] };
      return next;
    });
  }

  useEffect(() => {
    if (!doshaMode) return;
    const nextType = typeFromDoshaScores(scores);
    if (nextType && nextType !== selectedType) setSelectedType(nextType);
  }, [doshaMode, scores.vata, scores.pitta, scores.kapha]);

  async function savePrakriti() {
    const userId = user?.id;
    if (!userId) return;
    const prakrutiType = selectedType || inferredType;
    if (!prakrutiType) {
      onToast("Select a Prakriti type first");
      return;
    }
    try {
      setSaving(true);
      const saved = await saveUserPrakrutiAssessment(userId, {
        prakrutiType,
        thingToAvoidIds: selectedAvoid,
      });
      setAssessment(saved);
      setHistoryRows((prev) => [saved, ...prev.filter((row) => row.id !== saved.id)]);
      onToast("Prakriti assessment saved");
    } catch (err) {
      onToast(err?.message || "Failed to save Prakriti assessment");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="ua-cp-launch-prakriti-hint">Loading Prakriti config…</p>;
  }

  return (
    <div className="ua-cp-launch-prakriti-body">
      <p className="ua-cp-launch-prakriti-hint">
        {doshaMode
          ? "Tick the statements from Configs that describe the client. The dosha with the most ticks is their dominant Prakṛti."
          : "Use the interview questions from the Prakriti catalog, then save the matching type, recommendations, and things to avoid."}
      </p>
      <div className="ua-cp-launch-hero ua-cp-launch-hero--narrow">
        <PrakritiCard
          prakriti={{
            dominant: typeLabel,
            elements: PRAKRITI_ELEMENTS[activeType] || DOSHA_META[activeType]?.elements || "",
            scores: doshaMode ? scores : { vata: 0, pitta: 0, kapha: 0 },
          }}
        />
        <AttemptControls
          attempt={Math.max(history.length, 1)}
          historyCount={history.length}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((o) => !o)}
        />
        {historyOpen ? (
          <HistoryTable
            rows={history}
            variant="prakriti"
            footnote="Saved Prakriti results come from the client assessment history."
          />
        ) : null}
      </div>

      {types.length ? (
        <div className="ua-cp-ip-history__markers" style={{ marginBottom: 16 }}>
          {types.map((type) => {
            const active = selectedType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                className={`ua-cp-ip-marker${active ? " ua-cp-ip-badge--green" : ""}`}
                onClick={() => setSelectedType(type.value)}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="ua-cp-launch-score" style={{ marginBottom: 16 }}>
        <div>
          <span className="ua-cp-launch-score__label">Save Prakriti from catalog settings</span>
          {assessment?.prakrutiTypeLabel ? (
            <span className="ua-cp-launch-score__pts">Latest {assessment.prakrutiTypeLabel}</span>
          ) : null}
        </div>
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm"
          disabled={saving || !(selectedType || inferredType)}
          onClick={savePrakriti}
        >
          {saving ? "Saving…" : "Save Prakriti"}
        </button>
      </div>

      {doshaMode ? (
        <div className="ua-cp-launch-dosha-grid">
          {doshas.map((d) => (
            <DoshaColumn key={d.id} dosha={d} onToggle={toggleStatement} />
          ))}
        </div>
      ) : groupedQuestions.length ? (
        <div className="ua-cp-launch-questions" style={{ marginBottom: 16 }}>
          {groupedQuestions.map(([category, rows]) => (
            <div key={category} className="ua-cp-launch-domain ua-cp-launch-domain--open">
              <div className="ua-cp-launch-domain__head">
                <strong className="ua-cp-launch-domain__title">{category}</strong>
                <span className="ua-cp-launch-domain__meta">{rows.length} questions</span>
              </div>
              <div className="ua-cp-launch-dosha__list" style={{ padding: "8px 12px 12px" }}>
                {rows.map((q, index) => (
                  <div key={q.id} className="ua-cp-launch-dosha__item">
                    <span className="ua-cp-launch-qtable__n">{index + 1}.</span>
                    <span className="ua-cp-launch-dosha__text">{q.question || q.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ua-cp-launch-prakriti-hint">No Prakriti questions in the catalog yet.</p>
      )}

      <div className="ua-cp-launch-guide-grid">
        <div className="ua-cp-launch-guide ua-cp-launch-guide--rec">
          <div className="ua-cp-launch-guide__head">
            <div>
              <strong>Recommendations</strong>
              <span>From Prakriti catalog for {typeLabel}.</span>
            </div>
            {activeType ? <span className="ua-cp-launch-guide__tag">FOR {String(typeLabel).toUpperCase()}</span> : null}
          </div>
          <div className="ua-cp-launch-guide__list">
            {recommendations.length ? recommendations.map((item) => (
              <div key={item.id} className="ua-cp-launch-guide__item">
                <span className="ua-cp-launch-guide__bullet ua-cp-launch-guide__bullet--rec" />
                <span className="ua-cp-launch-guide__input" style={{ border: "none", background: "transparent" }}>
                  {item.title}
                </span>
              </div>
            )) : (
              <p className="ua-cp-launch-history__foot">No recommendations for this type yet.</p>
            )}
          </div>
        </div>
        <div className="ua-cp-launch-guide ua-cp-launch-guide--avoid">
          <div className="ua-cp-launch-guide__head">
            <div>
              <strong>Things to avoid</strong>
              <span>Select catalog items that apply to this client.</span>
            </div>
          </div>
          <div className="ua-cp-launch-guide__list">
            {thingsToAvoid.length ? thingsToAvoid.map((item) => {
              const id = item.id || item._id;
              const on = selectedAvoid.includes(id);
              return (
                <label key={id} className="ua-cp-launch-guide__item">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setSelectedAvoid((prev) => (
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    ))}
                  />
                  <span className="ua-cp-launch-guide__bullet ua-cp-launch-guide__bullet--avoid" />
                  <span className="ua-cp-launch-guide__input" style={{ border: "none", background: "transparent" }}>
                    {item.title}
                  </span>
                </label>
              );
            }) : (
              <p className="ua-cp-launch-history__foot">No things-to-avoid items in the catalog yet.</p>
            )}
          </div>
        </div>
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
  const [config, setConfig] = useState({ ratings: [], domains: [] });
  const [configLoading, setConfigLoading] = useState(true);
  const [focusAreas, setFocusAreas] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const launchStepDone = ["done", "skipped"].includes(
    String(user?.paidOnboardingStepStatus?.launch || "").toLowerCase(),
  ) || Boolean(user?.paidOnboardingCompleted);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || /^\d+$/.test(String(userId))) {
      setConfigLoading(false);
      return undefined;
    }
    let cancelled = false;
    setConfigLoading(true);
    fetchLaunchAssessmentConfig(userId)
      .then((data) => {
        if (cancelled) return;
        setConfig({
          ratings: data?.ratings || [],
          domains: data?.domains || [],
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setConfig({ ratings: [], domains: [] });
          onToast(err?.message || "Failed to load LAUNCH config");
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    fetchLaunchFocusAreas(userId)
      .then((rows) => { if (!cancelled) setFocusAreas(Array.isArray(rows) ? rows : rows?.focusAreas || []); })
      .catch(() => {});
    fetchUserLaunchAssessments(userId)
      .then((data) => {
        if (cancelled) return;
        const list = data?.assessments || data?.items || [];
        setAssessments(
          [...(Array.isArray(list) ? list : [])].sort((a, b) =>
            String(b.assessmentDate || b.updatedAt || "").localeCompare(String(a.assessmentDate || a.updatedAt || "")),
          ),
        );
      })
      .catch(() => {});
    fetchOnboardingMeetings(userId)
      .then((rows) => {
        if (cancelled) return;
        const meeting = (rows || []).find((row) => (
          row.stepKey === "launch"
          && ["slots_offered", "time_requested"].includes(row.status)
        ));
        setLaunchMeeting(meeting || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
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
        {launchStepDone ? null : (
          <div className="ua-cp-launch-schedule-wrap">
            <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--launch-schedule" onClick={() => setScheduleOpen(true)}>
              📅 Schedule LAUNCH meeting
            </button>
          </div>
        )}
      </div>
      {tab === "lifestyle" ? (
        <LifestyleTab
          user={user}
          onToast={onToast}
          config={config}
          loading={configLoading}
          assessments={assessments}
          onAssessmentsChange={setAssessments}
          focusAreas={focusAreas}
        />
      ) : (
        <PrakritiTab user={user} onToast={onToast} />
      )}
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
