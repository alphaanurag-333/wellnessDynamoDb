import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PillTabs } from "../shared.jsx";
import { suggestRating } from "../../data/launchData.js";
import { computeLaunchAssessment } from "../../data/launchConfigData.js";
import { ScheduleMeetingModal, slotsFromMeeting } from "./ScheduleMeetingModal.jsx";
import { ScoringReferenceModal } from "./ScoringReferenceModal.jsx";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import {
  cancelOnboardingMeeting,
  createOnboardingMeetingSlots,
  fetchLaunchAssessmentConfig,
  fetchLaunchFocusAreas,
  fetchOnboardingMeetings,
  fetchPrakrutiQuestions,
  fetchPrakrutiRecommendations,
  fetchPrakrutiThingsToAvoid,
  fetchUserLaunchAssessments,
  fetchUserPrakrutiAssessment,
  patchOnboardingStep,
  saveUserLaunchAssessment,
  saveUserPrakrutiAssessment,
  updateUserLaunchAssessment,
} from "../../api/onboardingApi.js";

const DOSHA_KEYS = ["vata", "pitta", "kapha"];
const DOSHA_META = {
  vata: { letter: "V", name: "Vāta", sub: "Air + Space", tone: "blue", elements: "Air + Space" },
  pitta: { letter: "P", name: "Pitta", sub: "Fire + Water", tone: "orange", elements: "Fire + Water" },
  kapha: { letter: "K", name: "Kapha", sub: "Earth + Water", tone: "green", elements: "Earth + Water" },
};
const PRAKRITI_ELEMENTS = {
  vata: "Air + Space",
  pitta: "Fire + Water",
  kapha: "Earth + Water",
  vata_pitta: "Air + Space · Fire + Water",
  pitta_kapha: "Fire + Water · Earth + Water",
  kapha_vata: "Earth + Water · Air + Space",
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
  const scoreOutOf10 = Number.isFinite(Number(finalScore))
    ? Number(finalScore).toFixed(1)
    : "0.0";
  return (
    <div className="ua-cp-launch-score">
      <div className="ua-cp-launch-score__copy">
        <span className="ua-cp-launch-score__label">Final life score</span>
        <span className="ua-cp-launch-score__pts">{overall} / {maxOverall} points</span>
      </div>
      <div className="ua-cp-launch-score__val">
        <strong>{scoreOutOf10}</strong>
        <span>/ 10</span>
      </div>
    </div>
  );
}

function PrakritiCard({ prakriti }) {
  const scores = prakriti.scores || {};
  const total = Math.max(1, (Number(scores.vata) || 0) + (Number(scores.pitta) || 0) + (Number(scores.kapha) || 0));
  const showBars = scores.vata != null || scores.pitta != null || scores.kapha != null;
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
            { key: "vata", label: "Vāta", tone: "blue", val: Number(scores.vata) || 0 },
            { key: "pitta", label: "Pitta", tone: "orange", val: Number(scores.pitta) || 0 },
            { key: "kapha", label: "Kapha", tone: "green", val: Number(scores.kapha) || 0 },
          ].map((d) => {
            const pct = Math.round((d.val / total) * 100);
            return (
              <div key={d.key} className="ua-cp-launch-prakriti-bar">
                <span className={`ua-cp-launch-prakriti-bar__dot ua-cp-launch-prakriti-bar__dot--${d.tone}`} />
                <span className="ua-cp-launch-prakriti-bar__label">{d.label}</span>
                <div className="ua-cp-launch-prakriti-bar__track">
                  <span
                    className={`ua-cp-launch-prakriti-bar__fill ua-cp-launch-prakriti-bar__fill--${d.tone}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="ua-cp-launch-prakriti-bar__val">{d.val} / 10</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AttemptControls({
  attempt,
  historyCount,
  historyOpen,
  onToggleHistory,
  onRerun,
  rerunLabel = "Re-run assessment",
  variant = "lifestyle",
}) {
  const showHistory = variant !== "prakriti" || historyCount > 0 || historyOpen;
  return (
    <div className={`ua-cp-launch-controls${variant === "prakriti" ? " ua-cp-launch-controls--prakriti" : ""}`}>
      <span className="ua-cp-launch-controls__attempt">Attempt {attempt}</span>
      {showHistory ? (
        <button type="button" className="ua-cp-launch-controls__btn" onClick={onToggleHistory}>
          {historyOpen ? `Hide history · ${historyCount}` : `History · ${historyCount}`}
        </button>
      ) : null}
      {onRerun ? (
        <button type="button" className="ua-cp-launch-controls__rerun" onClick={onRerun} title="Archive this result and start a fresh pass">
          <span className="ua-cp-launch-controls__rerun-icon" aria-hidden="true">↻</span>
          {rerunLabel}
        </button>
      ) : null}
    </div>
  );
}

function LaunchHeldBanner({
  meeting,
  firstName,
  canSchedule,
  onOfferMore,
  onRelease,
  onWithdrawSlot,
}) {
  const status = String(meeting?.status || "").toLowerCase();
  const slots = slotsFromMeeting(meeting);
  const count = slots.length || (meeting?.slots || []).length || 0;
  const times = slots.map(formatHeldMetaTime).filter(Boolean).join(" · ");
  const meta = [
    times,
    `${Number(meeting?.durationMinutes) || 60} min`,
    "Video call",
    `offered by ${offeredByLabel(meeting)}`,
  ].filter(Boolean).join(" · ");
  const left = releaseCountdown(meeting?.holdExpiresAt);
  let expiry = `${firstName} picks one in the app — the rest release on their own.`;
  if (left === "expired") expiry += " Hold has expired.";
  else if (left) expiry += ` Auto-releases in ${left} if there is no reply.`;

  return (
    <div className="ua-cp-launch-meet ua-cp-launch-meet--held">
      <div className="ua-cp-launch-meet__top">
        <div className="ua-cp-launch-meet__copy">
          <strong>
            {status === "time_requested"
              ? (() => {
                  const count = Array.isArray(meeting?.requestedSlots) && meeting.requestedSlots.length
                    ? meeting.requestedSlots.length
                    : (meeting?.requestedStartAt ? 1 : 0);
                  return count > 1
                    ? `Client requested ${count} times · awaiting your pick`
                    : `Client requested a time · awaiting ${firstName}`;
                })()
              : `${count} slot${count === 1 ? "" : "s"} held · awaiting ${firstName}`}
          </strong>
          <span>{meta || "Waiting for client to pick a slot."}</span>
        </div>
        {canSchedule ? (
          <div className="ua-cp-launch-meet__actions">
            <button type="button" className="ua-cp-launch-meet__btn" onClick={onOfferMore}>
              Offer more slots
            </button>
            <button type="button" className="ua-cp-launch-meet__btn ua-cp-launch-meet__btn--ghost" onClick={onRelease}>
              Release slots
            </button>
          </div>
        ) : null}
      </div>
      {slots.length ? (
        <div className="ua-cp-launch-meet__chips">
          {slots.map((slot) => (
            <span key={slot.key} className="ua-cp-launch-meet__chip">
              {formatHeldChip(slot)}
              {canSchedule ? (
                <button type="button" title="Withdraw this slot" onClick={() => onWithdrawSlot?.(slot.key)} aria-label="Withdraw slot">×</button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
      <p className="ua-cp-launch-meet__expiry">{expiry}</p>
    </div>
  );
}

function LaunchBookedBanner({ meeting, canSchedule, onOpenCalendar, onCancel }) {
  const when = formatBookedWhen(meeting);
  return (
    <div className="ua-cp-launch-meet ua-cp-launch-meet--booked">
      <div className="ua-cp-launch-meet__copy">
        <strong>{when ? `LAUNCH meeting confirmed · ${when}` : "LAUNCH meeting booked"}</strong>
        <span>
          {[
            `${Number(meeting?.durationMinutes) || 60} min`,
            "Video call",
            `with ${offeredByLabel(meeting)}`,
            "blocked in your calendar",
          ].join(" · ")}
        </span>
      </div>
      <div className="ua-cp-launch-meet__actions">
        <button type="button" className="ua-cp-launch-meet__btn ua-cp-launch-meet__btn--booked" onClick={onOpenCalendar}>
          Open calendar ›
        </button>
        {canSchedule ? (
          <button type="button" className="ua-cp-launch-meet__btn ua-cp-launch-meet__btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
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
  canWrite = true,
}) {
  const pct = domain.max ? Math.round((domain.score / domain.max) * 100) : 0;
  return (
    <div className={`ua-cp-launch-domain${open ? " ua-cp-launch-domain--open" : ""}`}>
      <button type="button" className="ua-cp-launch-domain__head" onClick={onToggle}>
        <div className="ua-cp-launch-domain__subhead">
          <span className="ua-cp-launch-domain__chev" aria-hidden="true" />
          <span className="ua-cp-launch-domain__num">{domain.num}</span>
          <strong className="ua-cp-launch-domain__title">{domain.title}</strong>
        </div>
        <div className="ua-cp-launch-domain__subhead">
          <span className="ua-cp-launch-domain__meta">
            {domain.questions} questions
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
                  const selected = ratingOptions.find((opt) => opt.id === rating);
                  const selectedTone = selected?.tone || selected?.id || "default";
                  const selectedLabel = (selected?.badge || selected?.name || selected?.label || "").toUpperCase();
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
                            title="Scoring reference"
                          >
                            i
                          </button>
                        ) : null}
                      </td>
                      <td className="ua-cp-launch-qtable__reply" data-label="User reply · coach notes">
                        {canWrite ? (
                          <input
                            className="ua-cp-launch-qtable__input"
                            value={reply}
                            onChange={(e) => onReplyChange(item.id, e.target.value)}
                            placeholder="User reply or coach notes…"
                            aria-label={`Reply for question ${i + 1}`}
                          />
                        ) : (
                          <span className="ua-cp-launch-qtable__reply-text">{reply || "—"}</span>
                        )}
                        {reply.trim() ? (
                          <span className="ua-cp-launch-qtable__reply-note">Noted by coach</span>
                        ) : null}
                      </td>
                      <td className="ua-cp-launch-qtable__rating" data-label="Coach rating">
                        {canWrite ? (
                          <div className="ua-cp-launch-qtable__rating-row">
                            <div className="ua-cp-launch-ratings">
                              {ratingOptions.map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  className={`ua-cp-launch-rating ua-cp-launch-rating--${opt.tone || "default"}${rating === opt.id ? " ua-cp-launch-rating--active" : ""}`}
                                  onClick={() => onRate(item.id, opt.id)}
                                  title={`${opt.points ?? ""} points`}
                                >
                                  {(opt.badge || opt.name || opt.label || "").toUpperCase()}
                                </button>
                              ))}
                            </div>
                            <div className="ua-cp-launch-qtable__score-row">
                              <span className="ua-cp-launch-qtable__score-label">Score</span>
                              <span className="ua-cp-launch-qtable__score">{item.earned}</span>
                              <span className="ua-cp-launch-qtable__score-max">/ {item.points}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="ua-cp-launch-qtable__rating-row">
                            {selected ? (
                              <span className={`ua-cp-launch-rating-pill ua-cp-launch-rating-pill--${selectedTone}`}>
                                {selectedLabel}
                              </span>
                            ) : (
                              <span className="ua-cp-launch-rating-pill ua-cp-launch-rating-pill--empty">—</span>
                            )}
                            <div className="ua-cp-launch-qtable__score-plain">
                              {item.earned} / {item.points}
                            </div>
                          </div>
                        )}
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

function FocusAreas({ autoPoints, catalog, selectedFocus, onToggleFocus, extraPoints, onAddPoint, onRemovePoint, onToast, canWrite = true }) {
  const [point, setPoint] = useState("");
  const merged = [...autoPoints, ...extraPoints];

  function addPoint() {
    const trimmed = point.trim();
    if (!trimmed) return;
    onAddPoint(trimmed);
    setPoint("");
    onToast("Focus point added — save assessment to sync to the app");
  }

  return (
    <div className="ua-cp-launch-focus">
      <div className="ua-cp-launch-focus__head">
        <div className="ua-cp-launch-focus__title-row">
          <span className="ua-cp-launch-focus__icon" aria-hidden="true">◎</span>
          <span className="ua-cp-launch-focus__title">Areas to focus</span>
        </div>
        <span className="ua-cp-launch-focus__sub">Domains scoring under 50% are flagged automatically. Add or remove points as needed.</span>
      </div>
      {merged.length ? (
        <div className="ua-cp-launch-focus__list">
          {merged.map((item, index) => (
            <div key={`${item}-${index}`} className="ua-cp-launch-focus__item">
              <span className="ua-cp-launch-focus__bullet" aria-hidden="true" />
              <span className="ua-cp-launch-focus__text">{item}</span>
              {canWrite && index >= autoPoints.length ? (
                <button type="button" className="ua-cp-launch-focus__remove" onClick={() => onRemovePoint(index - autoPoints.length)} aria-label="Remove focus point">×</button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="ua-cp-launch-focus__empty">No focus areas — all domains are above 50%.</div>
      )}
      {canWrite && catalog.length ? (
        <div className="ua-cp-launch-focus__catalog">
          {catalog.map((area) => {
            const id = area.id || area._id;
            const active = selectedFocus.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`ua-cp-launch-focus__chip${active ? " ua-cp-launch-focus__chip--on" : ""}`}
                onClick={() => onToggleFocus(id)}
              >
                {area.title || area.name || id}
              </button>
            );
          })}
        </div>
      ) : null}
      {canWrite ? (
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
      ) : null}
    </div>
  );
}

function DoshaColumn({ dosha, onToggle, canWrite = true }) {
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
          <span>/ 10</span>
        </span>
      </div>
      <div className="ua-cp-launch-dosha__list">
        {dosha.statements.map((s) => (
          <button
            key={s.id || s.text}
            type="button"
            className={`ua-cp-launch-dosha__item${s.checked ? " ua-cp-launch-dosha__item--on" : ""}`}
            onClick={() => canWrite && onToggle(dosha.id, s.id || s.text)}
            disabled={!canWrite}
            aria-pressed={s.checked}
          >
            <span className={`ua-cp-launch-dosha__check${s.checked ? " ua-cp-launch-dosha__check--on" : ""}`} aria-hidden="true">
              {s.checked ? "✓" : ""}
            </span>
            <span className="ua-cp-launch-dosha__text">{s.text}</span>
          </button>
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

/** Prefer Vata/Pitta/Kapha checklist rows from the master catalog. */
function doshaQuestionsOnly(questions) {
  return (questions || []).filter((q) => DOSHA_KEYS.includes(categoryKey(q.category)));
}

function typeFromDoshaScores(scores) {
  const ranked = DOSHA_KEYS
    .map((key) => ({ key, score: Number(scores[key]) || 0 }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const second = ranked[1];
  if (!top || top.score <= 0) return { type: "", label: "", elements: "" };
  // Figma: within 1 point of the runner-up → dual prakṛti (higher score named first)
  if (second && top.score - second.score <= 1) {
    const pair = [top.key, second.key].sort().join("_");
    let type = "";
    if (pair === "pitta_vata") type = "vata_pitta";
    else if (pair === "kapha_pitta") type = "pitta_kapha";
    else if (pair === "kapha_vata") type = "kapha_vata";
    return {
      type,
      label: `${DOSHA_META[top.key].name}-${DOSHA_META[second.key].name}`,
      elements: `${DOSHA_META[top.key].elements} · ${DOSHA_META[second.key].elements}`,
    };
  }
  return {
    type: top.key,
    label: DOSHA_META[top.key].name,
    elements: DOSHA_META[top.key].elements,
  };
}

function LifestyleTab({
  user,
  onToast,
  onUserUpdated,
  config,
  loading,
  assessments,
  onAssessmentsChange,
  focusAreas,
  canWrite = true,
  meetingBanner = null,
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [openDomains, setOpenDomains] = useState(() => new Set());
  const [ratings, setRatings] = useState({});
  const [replies, setReplies] = useState({});
  const [scoringRef, setScoringRef] = useState(null);
  const [selectedFocus, setSelectedFocus] = useState([]);
  const [extraPoints, setExtraPoints] = useState([]);
  const [saving, setSaving] = useState(false);
  const hydratedFocusRef = useRef(null);

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

  useEffect(() => {
    if (!latest?.id) return;
    if (hydratedFocusRef.current === latest.id) return;
    const saved = Array.isArray(latest.focusPoints) ? latest.focusPoints : [];
    const isAutoPoint = (text) => / is below 50% \(\d+(?:\.\d+)? \/ \d+\)$/.test(String(text || ""));
    setExtraPoints(saved.filter((point) => !isAutoPoint(point)));
    hydratedFocusRef.current = latest.id;
  }, [latest]);

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
      focusPoints: [...autoPoints, ...extraPoints],
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
      if (saved?.id) hydratedFocusRef.current = saved.id;

      const launchStatus = String(user?.paidOnboardingStepStatus?.launch || "").toLowerCase();
      const shouldCompleteLaunch =
        !user?.paidOnboardingCompleted
        && launchStatus !== "done"
        && launchStatus !== "skipped"
        && !/^\d+$/.test(String(userId));

      if (shouldCompleteLaunch) {
        try {
          const data = await patchOnboardingStep(userId, "launch", "done");
          const nextStatus = data?.paidOnboardingStepStatus || {
            ...user.paidOnboardingStepStatus,
            launch: "done",
          };
          onUserUpdated?.({
            ...user,
            paidOnboardingStepStatus: nextStatus,
            paidOnboardingCompleted: Boolean(data?.paidOnboardingCompleted),
          });
        } catch (stepErr) {
          onToast(stepErr?.message || "Assessment saved, but failed to mark LAUNCH complete");
          setSaving(false);
          return;
        }
      }

      onToast("LAUNCH assessment saved");
    } catch (err) {
      onToast(err?.message || "Failed to save LAUNCH assessment");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        {meetingBanner}
        <p className="ua-cp-launch-prakriti-hint">Loading LAUNCH config…</p>
      </>
    );
  }

  if (!totals.domainRows.length) {
    return (
      <>
        {meetingBanner}
        <p className="ua-cp-launch-prakriti-hint">
          No live LAUNCH domains yet. Add them in Configs → LAUNCH.
        </p>
      </>
    );
  }

  if (!ratingOptions.length) {
    return (
      <>
        {meetingBanner}
        <p className="ua-cp-launch-prakriti-hint">
          LAUNCH ratings are missing. Add Excellent / Good / Fair / Poor in Configs → LAUNCH.
        </p>
      </>
    );
  }

  return (
    <>
      <div className={`ua-cp-launch-hero ua-cp-launch-col${meetingBanner ? " ua-cp-launch-hero--with-meet" : ""}`}>
        {meetingBanner}
        <ScoreCard overall={totals.overall} maxOverall={totals.maxOverall} finalScore={totals.finalScore} />
        <AttemptControls
          attempt={attempt || 1}
          historyCount={history.length}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((o) => !o)}
          onRerun={canWrite ? rerunAssessment : null}
        />
        {historyOpen ? (
          <HistoryTable
            rows={history}
            footnote="Every re-run archives the previous result. Nothing is overwritten."
          />
        ) : null}
      </div>
      <div className="ua-cp-launch-domains-toolbar">
        <button type="button" className="ua-cp-launch-questions__expand-btn" onClick={expandAll}>Expand all</button>
        <button type="button" className="ua-cp-launch-questions__expand-btn" onClick={collapseAll}>Collapse all</button>
      </div>
      <div className="ua-cp-launch-domains">
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
          canWrite={canWrite}
        />
      ))}
      </div>
      {canWrite ? (
      <div className="ua-cp-launch-savebar">
        <div className="ua-cp-launch-savebar__copy">
          <span className="ua-cp-launch-savebar__label">Save this attempt</span>
          {latest != null ? <span className="ua-cp-launch-savebar__meta">Latest score {latest.totalScore}</span> : null}
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
      ) : null}
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
        canWrite={canWrite}
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

function PrakritiTab({ user, onToast, canWrite = true, meetingBanner = null }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [types, setTypes] = useState([]);
  const [thingsToAvoid, setThingsToAvoid] = useState([]);
  const [catalogRecommendations, setCatalogRecommendations] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [recItems, setRecItems] = useState([]);
  const [avoidItems, setAvoidItems] = useState([]);
  const [checked, setChecked] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAvoid, setSavingAvoid] = useState(false);
  const [forceNew, setForceNew] = useState(false);
  const [listsTouched, setListsTouched] = useState(false);

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
        setQuestions(doshaQuestionsOnly(Array.isArray(qs) ? qs : []));
        setThingsToAvoid(Array.isArray(avoid) ? avoid : []);
        setTypes(data?.prakrutiTypes || []);
        setAssessment(data?.assessment || null);
        setHistoryRows(Array.isArray(data?.history) ? data.history : []);
        const type = data?.assessment?.prakrutiType || "";
        setSelectedType(type);
        const savedRec = data?.assessment?.recommendationTexts
          || data?.assessment?.recommendationTitles
          || [];
        const savedAvoid = data?.assessment?.avoidTexts
          || data?.assessment?.thingsToAvoidTitles
          || [];
        setRecItems(Array.isArray(savedRec) ? savedRec : []);
        setAvoidItems(Array.isArray(savedAvoid) && savedAvoid.length
          ? savedAvoid
          : (Array.isArray(avoid) ? avoid.map((a) => a.title).filter(Boolean) : []));
        setListsTouched(Boolean(
          (Array.isArray(data?.assessment?.recommendationTexts) && data.assessment.recommendationTexts.length)
          || (Array.isArray(data?.assessment?.avoidTexts) && data.assessment.avoidTexts.length)
          || (Array.isArray(savedRec) && savedRec.length)
        ));
        const selectedIds = data?.assessment?.selectedQuestionIds || [];
        if (Array.isArray(selectedIds) && selectedIds.length) {
          const nextChecked = {};
          selectedIds.forEach((id) => { nextChecked[id] = true; });
          setChecked(nextChecked);
        } else {
          setChecked({});
        }
        setForceNew(false);
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
      setCatalogRecommendations([]);
      return undefined;
    }
    let cancelled = false;
    fetchPrakrutiRecommendations(userId, selectedType)
      .then((rows) => {
        if (cancelled) return;
        const titles = (rows || []).map((r) => r.title).filter(Boolean);
        setCatalogRecommendations(titles);
        if (!listsTouched) setRecItems(titles);
      })
      .catch(() => {
        if (!cancelled) setCatalogRecommendations([]);
      });
    return () => { cancelled = true; };
  }, [user?.id, selectedType, listsTouched]);

  const doshas = useMemo(() => {
    return DOSHA_KEYS.map((id) => {
      const statements = questions
        .filter((q) => categoryKey(q.category) === id)
        .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
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
        max: Math.max(statements.length, 10),
      };
    });
  }, [checked, questions]);

  const scores = {
    vata: doshas.find((d) => d.id === "vata")?.score || 0,
    pitta: doshas.find((d) => d.id === "pitta")?.score || 0,
    kapha: doshas.find((d) => d.id === "kapha")?.score || 0,
  };

  const inferred = typeFromDoshaScores(scores);
  const typeLabel = inferred.label
    || types.find((t) => t.value === (selectedType || inferred.type))?.label
    || DOSHA_META[selectedType || inferred.type]?.name
    || selectedType
    || inferred.type
    || "—";
  const typeElements = inferred.elements
    || PRAKRITI_ELEMENTS[selectedType || inferred.type]
    || DOSHA_META[selectedType || inferred.type]?.elements
    || "";

  const history = [...historyRows]
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .map((row, index, arr) => {
      const sc = row.scores || {};
      const scoreDetail = (sc.vata != null || sc.pitta != null || sc.kapha != null)
        ? `V ${sc.vata || 0} · P ${sc.pitta || 0} · K ${sc.kapha || 0}`
        : ((row.thingsToAvoidTitles || []).slice(0, 2).join(" · ") || "—");
      return {
        attempt: arr.length - index,
        type: row.prakrutiTypeLabel || row.prakrutiType,
        scores: scoreDetail,
        role: historyRole(row.createdByRole),
        by: historyRole(row.createdByRole) === "ADMIN" ? "Admin desk" : "Wellness coach",
        date: formatLaunchDate(row.updatedAt || row.createdAt),
      };
    });

  function toggleStatement(doshaId, statementId) {
    setChecked((prev) => ({ ...prev, [statementId]: !prev[statementId] }));
  }

  useEffect(() => {
    const next = typeFromDoshaScores(scores);
    if (next.type !== selectedType) {
      setSelectedType(next.type || "");
      if (!listsTouched) setRecItems([]);
    }
  }, [scores.vata, scores.pitta, scores.kapha, selectedType, listsTouched]);

  async function savePrakriti() {
    const userId = user?.id;
    if (!userId) return;
    const prakrutiType = selectedType || inferred.type;
    if (!prakrutiType) {
      onToast("Tick statements to determine Prakriti type first");
      return;
    }
    try {
      setSaving(true);
      const selectedQuestionIds = Object.keys(checked).filter((id) => checked[id]);
      const saved = await saveUserPrakrutiAssessment(userId, {
        prakrutiType,
        thingToAvoidIds: [],
        recommendationTexts: recItems.map((t) => String(t || "").trim()).filter(Boolean),
        avoidTexts: avoidItems.map((t) => String(t || "").trim()).filter(Boolean),
        selectedQuestionIds,
        scores,
        forceNew,
      });
      setAssessment(saved);
      setHistoryRows((prev) => [saved, ...prev.filter((row) => row.id !== saved.id)]);
      setForceNew(false);
      setListsTouched(true);
      onToast("Prakriti assessment saved");
    } catch (err) {
      onToast(err?.message || "Failed to save Prakriti assessment");
    } finally {
      setSaving(false);
    }
  }

  async function saveAvoidSection() {
    const userId = user?.id;
    if (!userId) return;
    const prakrutiType = assessment?.prakrutiType || selectedType || inferred.type;
    if (!prakrutiType) {
      onToast("Save the Prakriti assessment first");
      return;
    }
    try {
      setSavingAvoid(true);
      const selectedQuestionIds = Array.isArray(assessment?.selectedQuestionIds) && assessment.selectedQuestionIds.length
        ? assessment.selectedQuestionIds
        : Object.keys(checked).filter((id) => checked[id]);
      const saved = await saveUserPrakrutiAssessment(userId, {
        prakrutiType,
        thingToAvoidIds: [],
        recommendationTexts: recItems.map((t) => String(t || "").trim()).filter(Boolean),
        avoidTexts: avoidItems.map((t) => String(t || "").trim()).filter(Boolean),
        selectedQuestionIds,
        scores: assessment?.scores || scores,
        forceNew: false,
      });
      setAssessment(saved);
      setHistoryRows((prev) => [saved, ...prev.filter((row) => row.id !== saved.id)]);
      setListsTouched(true);
      onToast("Things to avoid saved");
    } catch (err) {
      onToast(err?.message || "Failed to save things to avoid");
    } finally {
      setSavingAvoid(false);
    }
  }

  if (loading) {
    return (
      <>
        {meetingBanner}
        <p className="ua-cp-launch-prakriti-hint">Loading Prakriti config…</p>
      </>
    );
  }

  const hasStatements = doshas.some((d) => d.statements.length > 0);
  // Show guidance only after a saved assessment (hide during a fresh re-run until save).
  const assessmentComplete = Boolean(
    assessment?.prakrutiType || assessment?.prakrutiTypeLabel || assessment?.id,
  ) && !forceNew;

  return (
    <div className="ua-cp-launch-prakriti-body">
      <p className="ua-cp-launch-prakriti-hint">
        Tick the statements that describe the client. Scores come from the Vāta · Pitta · Kapha master catalog.
      </p>
      <div className={`ua-cp-launch-hero ua-cp-launch-hero--narrow ua-cp-launch-col${meetingBanner ? " ua-cp-launch-hero--with-meet" : ""}`}>
        {meetingBanner}
        <PrakritiCard
          prakriti={{
            dominant: typeLabel,
            elements: typeElements,
            scores,
          }}
        />
        <AttemptControls
          attempt={Math.max(history.length + (forceNew ? 1 : 0), 1)}
          historyCount={history.length}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((o) => !o)}
          onRerun={canWrite ? () => {
            setChecked({});
            setSelectedType("");
            setRecItems(catalogRecommendations.length ? catalogRecommendations : []);
            setAvoidItems(thingsToAvoid.map((a) => a.title).filter(Boolean));
            setListsTouched(false);
            setForceNew(true);
            setHistoryOpen(true);
            onToast("New Prakriti attempt started · previous result stays in history");
          } : null}
          variant="prakriti"
        />
        {historyOpen ? (
          <HistoryTable
            rows={history}
            variant="prakriti"
            footnote="Every re-run archives the previous result. Nothing is overwritten."
          />
        ) : null}
      </div>

      {hasStatements ? (
        <div className="ua-cp-launch-dosha-grid">
          {doshas.map((d) => (
            <DoshaColumn key={d.id} dosha={d} onToggle={toggleStatement} canWrite={canWrite} />
          ))}
        </div>
      ) : (
        <p className="ua-cp-launch-prakriti-hint">
          No Prakriti statements in the master yet. Add Vāta · Pitta · Kapha items in Configs → Prakriti assessment.
        </p>
      )}

      {canWrite ? (
        <div className="ua-cp-launch-savebar ua-cp-launch-savebar--prakriti">
          <div className="ua-cp-launch-savebar__copy">
            <span className="ua-cp-launch-savebar__label">Save Prakriti assessment</span>
            {assessment?.prakrutiTypeLabel ? (
              <span className="ua-cp-launch-savebar__meta">
                Latest {assessment.prakrutiTypeLabel}
                {forceNew ? " · next save starts a new attempt" : ""}
              </span>
            ) : (
              <span className="ua-cp-launch-savebar__meta">
                {typeLabel !== "—" ? `${typeLabel} · ` : ""}Ticks update the dominant type live
              </span>
            )}
          </div>
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm"
            disabled={saving || !(selectedType || inferred.type)}
            onClick={savePrakriti}
          >
            {saving ? "Saving…" : "Save Prakriti"}
          </button>
        </div>
      ) : null}

      {assessmentComplete ? (
      <div className="ua-cp-launch-guide-grid">
        <div className="ua-cp-launch-guide ua-cp-launch-guide--rec">
          <div className="ua-cp-launch-guide__head">
            <div>
              <strong>Recommendations</strong>
              <span>Diet &amp; lifestyle guidance suited to this Prakṛti.</span>
            </div>
            {typeLabel && typeLabel !== "—" ? (
              <span className="ua-cp-launch-guide__tag">For {typeLabel}</span>
            ) : null}
          </div>
          <div className="ua-cp-launch-guide__list">
            {recItems.length ? recItems.map((text, index) => (
              <div key={`rec-${index}`} className="ua-cp-launch-guide__item">
                <span className="ua-cp-launch-guide__bullet ua-cp-launch-guide__bullet--rec" />
                {canWrite ? (
                  <input
                    className="ua-cp-launch-guide__input"
                    value={text}
                    onChange={(e) => {
                      setListsTouched(true);
                      const value = e.target.value;
                      setRecItems((prev) => prev.map((row, i) => (i === index ? value : row)));
                    }}
                    aria-label={`Recommendation ${index + 1}`}
                  />
                ) : (
                  <span className="ua-cp-launch-guide__text">{text}</span>
                )}
                {canWrite ? (
                  <button
                    type="button"
                    className="ua-cp-launch-guide__remove"
                    title="Remove"
                    onClick={() => {
                      setListsTouched(true);
                      setRecItems((prev) => prev.filter((_, i) => i !== index));
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            )) : (
              <p className="ua-cp-launch-history__foot">No recommendations for this type yet.</p>
            )}
          </div>
          {canWrite ? (
            <button
              type="button"
              className="ua-cp-launch-guide__add ua-cp-launch-guide__add--rec"
              onClick={() => {
                setListsTouched(true);
                setRecItems((prev) => [...prev, ""]);
              }}
            >
              + Add recommendation
            </button>
          ) : null}
        </div>

        <div className="ua-cp-launch-guide ua-cp-launch-guide--avoid">
          <div className="ua-cp-launch-guide__head">
            <div>
              <strong>Things to avoid</strong>
              <span>Foods &amp; habits that aggravate this Prakṛti.</span>
            </div>
          </div>
          <div className="ua-cp-launch-guide__list">
            {avoidItems.length ? avoidItems.map((text, index) => (
              <div key={`avoid-${index}`} className="ua-cp-launch-guide__item">
                <span className="ua-cp-launch-guide__bullet ua-cp-launch-guide__bullet--avoid" />
                {canWrite ? (
                  <input
                    className="ua-cp-launch-guide__input"
                    value={text}
                    onChange={(e) => {
                      setListsTouched(true);
                      const value = e.target.value;
                      setAvoidItems((prev) => prev.map((row, i) => (i === index ? value : row)));
                    }}
                    aria-label={`Thing to avoid ${index + 1}`}
                  />
                ) : (
                  <span className="ua-cp-launch-guide__text">{text}</span>
                )}
                {canWrite ? (
                  <button
                    type="button"
                    className="ua-cp-launch-guide__remove"
                    title="Remove"
                    onClick={() => {
                      setListsTouched(true);
                      setAvoidItems((prev) => prev.filter((_, i) => i !== index));
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            )) : (
              <p className="ua-cp-launch-history__foot">No things-to-avoid items yet.</p>
            )}
          </div>
          {canWrite ? (
            <div className="ua-cp-launch-guide__foot">
              <button
                type="button"
                className="ua-cp-launch-guide__add ua-cp-launch-guide__add--avoid"
                onClick={() => {
                  setListsTouched(true);
                  setAvoidItems((prev) => [...prev, ""]);
                }}
              >
                + Add item
              </button>
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--sm ua-cp-launch-guide__save"
                disabled={savingAvoid || saving}
                onClick={saveAvoidSection}
              >
                {savingAvoid ? "Saving…" : "Save"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
    </div>
  );
}

function offeredByLabel(meeting) {
  const role = String(meeting?.createdByRole || "").toLowerCase();
  if (role.includes("admin")) return "Admin desk";
  return "Wellness coach";
}

function releaseCountdown(iso) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours} h ${mins} min`;
}

function holdLabelFromExpires(iso) {
  const ms = new Date(iso || 0).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "6 hours";
  const hours = ms / 3600000;
  if (hours <= 6) return "6 hours";
  if (hours <= 12) return "12 hours";
  if (hours <= 24) return "24 hours";
  if (hours <= 48) return "48 hours";
  return "7 days";
}

function formatHeldChip(slot) {
  const start = new Date(slot?.startAt || slot?.start || "");
  if (Number.isNaN(start.getTime())) return "";
  const day = `${String(start.getDate()).padStart(2, "0")} ${start.toLocaleString("en-GB", { month: "short" })}`;
  const time = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  return `${day} · ${time}`;
}

function formatHeldMetaTime(slot) {
  const start = new Date(slot?.startAt || slot?.start || "");
  if (Number.isNaN(start.getTime())) return "";
  const day = `${String(start.getDate()).padStart(2, "0")} ${start.toLocaleString("en-GB", { month: "short" })}`;
  const time = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  return `${day} ${time}`;
}

function formatBookedWhen(meeting) {
  const selected = (meeting?.slots || []).find((s) => s.selected || s.confirmed) || meeting?.slots?.[0];
  const start = new Date(selected?.startAt || meeting?.confirmedAt || "");
  if (Number.isNaN(start.getTime())) return "";
  const date = `${String(start.getDate()).padStart(2, "0")} ${start.toLocaleString("en-GB", { month: "short" })} ${start.getFullYear()}`;
  const time = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  return `${date} at ${time}`;
}

export function LaunchSection({ user, onToast, onUserUpdated }) {
  const navigate = useNavigate();
  const { canEdit, canCreate } = useClientSectionPermissions("launch");
  const { can } = useViewAs();
  const canWrite = canEdit || canCreate;
  const canSchedule = can("console.cal.create");
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") === "prakriti" ? "prakriti" : "lifestyle";
  const [tab, setTab] = useState(tabFromUrl);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [launchMeeting, setLaunchMeeting] = useState(null);
  const [config, setConfig] = useState({ ratings: [], domains: [] });
  const [configLoading, setConfigLoading] = useState(true);
  const [focusAreas, setFocusAreas] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const meetingStatus = String(launchMeeting?.status || "").toLowerCase();
  const meetingHeld = ["slots_offered", "time_requested"].includes(meetingStatus);
  const meetingBooked = ["booked", "confirmed", "scheduled"].includes(meetingStatus);
  const firstName = String(user?.name || "client").split(" ")[0];
  const heldSlots = useMemo(() => slotsFromMeeting(launchMeeting), [launchMeeting]);

  useEffect(() => {
    if (!meetingHeld || !launchMeeting?.holdExpiresAt) return undefined;
    const id = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [meetingHeld, launchMeeting?.holdExpiresAt]);

  async function releaseLaunchSlots() {
    if (!launchMeeting?.id || !user?.id) return;
    try {
      await cancelOnboardingMeeting(user.id, launchMeeting.id);
      setLaunchMeeting(null);
      onToast("Slots released");
    } catch (err) {
      onToast(err?.message || "Failed to release slots");
    }
  }

  async function withdrawHeldSlot(slotKey) {
    if (!launchMeeting || !user?.id) return;
    const remaining = heldSlots.filter((s) => s.key !== slotKey);
    try {
      if (!remaining.length) {
        await cancelOnboardingMeeting(user.id, launchMeeting.id);
        setLaunchMeeting(null);
        onToast("Slot withdrawn · offer released");
        return;
      }
      const meeting = await createOnboardingMeetingSlots(user.id, {
        stepKey: "launch",
        slots: remaining.map((s) => ({ startAt: s.startAt, endAt: s.endAt })),
        note: launchMeeting.coachNote || "",
        hold: holdLabelFromExpires(launchMeeting.holdExpiresAt),
        durationMinutes: Number(launchMeeting.durationMinutes) || 60,
      });
      setLaunchMeeting(meeting || null);
      onToast("Slot withdrawn");
    } catch (err) {
      onToast(err?.message || "Failed to withdraw slot");
    }
  }

  const meetingBanner = meetingHeld && launchMeeting ? (
    <LaunchHeldBanner
      key={`held-${launchMeeting.id}-${nowTick}`}
      meeting={launchMeeting}
      firstName={firstName}
      canSchedule={canSchedule}
      onOfferMore={() => setScheduleOpen(true)}
      onRelease={releaseLaunchSlots}
      onWithdrawSlot={withdrawHeldSlot}
    />
  ) : meetingBooked && launchMeeting ? (
    <LaunchBookedBanner
      meeting={launchMeeting}
      canSchedule={canSchedule}
      onOpenCalendar={() => navigate("/calendar")}
      onCancel={releaseLaunchSlots}
    />
  ) : null;

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
        const active = new Set(["slots_offered", "time_requested", "booked", "confirmed", "scheduled"]);
        const meeting = (rows || []).find((row) => (
          row.stepKey === "launch" && active.has(String(row.status || "").toLowerCase())
        )) || null;
        setLaunchMeeting(meeting);
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
      <div className="ua-cp-launch-top ua-cp-launch-col">
        <LaunchHeader />
        <div className="ua-cp-launch-tabs">
          <PillTabs
            size="md"
            active={tab}
            onChange={handleTabChange}
            tabs={[
              { id: "lifestyle", label: "Lifestyle score" },
              { id: "prakriti", label: "Prakriti type" },
            ]}
          />
        </div>
        {canSchedule && !meetingBooked && !meetingHeld ? (
          <div className="ua-cp-launch-schedule-wrap">
            <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--launch-schedule" onClick={() => setScheduleOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18v16H3z"></path><path d="M3 10h18"></path><path d="M8 3v4"></path><path d="M16 3v4"></path></svg> Schedule LAUNCH meeting
            </button>
          </div>
        ) : null}
      </div>
      {tab === "lifestyle" ? (
        <LifestyleTab
          user={user}
          onToast={onToast}
          onUserUpdated={onUserUpdated}
          config={config}
          loading={configLoading}
          assessments={assessments}
          onAssessmentsChange={setAssessments}
          focusAreas={focusAreas}
          canWrite={canWrite}
          meetingBanner={meetingBanner}
        />
      ) : (
        <PrakritiTab user={user} onToast={onToast} canWrite={canWrite} meetingBanner={meetingBanner} />
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
