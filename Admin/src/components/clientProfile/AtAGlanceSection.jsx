import { useEffect, useMemo, useState } from "react";
import {
  ACTIVE_SUPPLEMENTS,
  buildOnboardingRemindMessage,
  DAILY_METRICS,
  DEFAULT_REMINDERS,
  METABOLIC_SNAPSHOT,
  ONBOARDING_INITIAL_DONE,
  ONBOARDING_STEP_NOTES,
  ONBOARDING_STEPS,
} from "../../data/userDetailData.js";
import { getNextOnboardingStepLabel } from "../../api/usersApi.js";
import { ClientRemindModal } from "./ClientRemindModal.jsx";
import { ChampionCelebrationOverlay } from "./ChampionCelebrationOverlay.jsx";
import { ReviewHistoryModal } from "./ReviewHistoryModal.jsx";
import { HealthProgressCarousel } from "./HealthProgressCarousel.jsx";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal.jsx";

const METRIC_TONE = {
  blue: "#5e6ad2",
  teal: "#0d9488",
  gold: "#d4a017",
  sky: "#38bdf8",
  orange: "#ec7a45",
};

const RAIN_DROPS = Array.from({ length: 32 }, (_, i) => ({
  left: `${(i * 13.7 + (i % 6) * 9.3) % 98}%`,
  delay: `${((i * 0.13) % 1.6).toFixed(2)}s`,
  duration: `${(0.52 + (i % 8) * 0.07).toFixed(2)}s`,
  height: `${12 + (i % 6) * 5}px`,
  opacity: 0.22 + (i % 5) * 0.12,
}));

function GlanceRainOverlay() {
  return (
    <div className="ua-cp-glance-rain" aria-hidden="true">
      {RAIN_DROPS.map((drop, i) => (
        <span
          key={i}
          className="ua-cp-glance-rain__drop"
          style={{
            left: drop.left,
            height: drop.height,
            opacity: drop.opacity,
            animationDelay: drop.delay,
            animationDuration: drop.duration,
          }}
        />
      ))}
    </div>
  );
}

function waterHydrationTip(metric) {
  const current = parseInt(metric.value, 10) || 6;
  const goal = parseInt(metric.goal, 10) || 8;
  return `Hydration — ${current} of ${goal} glasses today`;
}

function MiniBars({ values, color }) {
  const max = Math.max(...values, 1);
  return (
    <div className="ua-cp-bars" aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} className="ua-cp-bars__bar" style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.35 + i * 0.13 }} />
      ))}
    </div>
  );
}

function DosageBadge({ label, tone }) {
  return <span className={`ua-cp-dosage ua-cp-dosage--${tone}`}>{label}</span>;
}

function GlanceHeader({ user, onOpenReview }) {
  const joinedLabel = user.joinedAgo || (user.ageDays === 0 ? "today" : user.ageDays > 0 ? `${user.ageDays} days ago` : "");
  const name = String(user.name || "").trim() || "Client";
  return (
    <div className="ua-cp-glance-head">
      <div>
        <h2 className="ua-cp-glance-head__title">At a Glance</h2>
        <p className="ua-cp-glance-head__sub">
          {name}
          {joinedLabel ? ` · Joined ${joinedLabel}` : ""}
        </p>
      </div>
      <div className="ua-cp-glance-head__badges">
        <button type="button" className="ua-cp-glance-badge ua-cp-glance-badge--review" onClick={onOpenReview} title="View review history">
          ⏱️ Last reviewed {user.lastReviewed || "—"} ›
        </button>
        <span className="ua-cp-glance-badge ua-cp-glance-badge--updated">
          ⚑ Updated {user.lastUpdated || "—"}
        </span>
      </div>
    </div>
  );
}

function PreviewToggle({ mode, onChange }) {
  return (
    <div className="ua-cp-preview-bar">
      <span className="ua-cp-preview-bar__label">Preview</span>
      <button type="button" className={`ua-cp-preview-tab${mode === "onboarding" ? " ua-cp-preview-tab--active" : ""}`} onClick={() => onChange("onboarding")}>Onboarding view</button>
      <button type="button" className={`ua-cp-preview-tab${mode === "onboarded" ? " ua-cp-preview-tab--active" : ""}`} onClick={() => onChange("onboarded")}>Onboarded view</button>
      <span className="ua-cp-preview-bar__hint">demo toggle — real dashboards switch automatically</span>
    </div>
  );
}

function MetabolicSnapshot({ onNavigate }) {
  return (
    <div className="ua-cp-glance-block">
      <div className="ua-cp-metabolic__head">
        <span className="ua-cp-metabolic__label">Metabolic snapshot</span>
        <button type="button" className="ua-cp-metabolic__link" onClick={() => onNavigate?.("body")}>View full history ›</button>
      </div>
      <div className="ua-cp-metabolic-row">
        {METABOLIC_SNAPSHOT.map((m, i) => (
          <div key={m.label} className="ua-cp-metabolic-row__group">
            {i > 0 ? <div className="ua-cp-metabolic-row__sep" aria-hidden="true" /> : null}
            <div className="ua-cp-metabolic-row__col metcol">
              <div className="ua-cp-metabolic-row__key">{m.label}</div>
              <div className={`ua-cp-metabolic-row__val ua-cp-metabolic-row__val--${m.tone}`}>{m.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthCardsRow({ user, onNavigate, onCelebrate }) {
  const score = user.lifestyleScore || 7.2;
  const ringPct = Math.min(100, (score / 10) * 100);
  return (
    <div className="ua-cp-glance-block ua-cp-health-band">
      <div className="ua-cp-health-band__stats">
        <button type="button" className="ua-cp-health-stat cdact" onClick={() => onNavigate?.("launch")}>
          <span className="ua-cp-health-stat__label">Lifestyle</span>
          <div className="cdlifering" style={{ background: `conic-gradient(#5e6ad2 ${ringPct * 3.6}deg, #e8edf5 0)` }}>
            <div className="cdlifering__inner"><span>{score}</span></div>
          </div>
          <span className="ua-cp-health-stat__link">History ›</span>
        </button>
        <button type="button" className="ua-cp-health-stat cdact" onClick={() => onNavigate?.("launch", { tab: "prakriti" })}>
          <span className="ua-cp-health-stat__label">Prakriti</span>
          <span className="prakchip"><span className="prakemoji">🧘</span> {user.prakriti || "Vata"}</span>
          <span className="ua-cp-health-stat__link ua-cp-health-stat__link--purple">History ›</span>
        </button>
      </div>

      <div className="ua-cp-hero-stats">
        <button type="button" className="ua-cp-hero-stat cdact" onClick={() => onNavigate?.("reflection")}>
          <span className="ua-cp-hero-stat__label">Daily</span>
          <strong>{user.dailyScore || 91}<span>/100</span></strong>
          <span className="ua-cp-hero-stat__sub">from DRF ›</span>
        </button>
        <span className="ua-cp-hero-stats__sep" aria-hidden="true" />
        <button type="button" className="ua-cp-hero-stat ua-cp-hero-stat--monthly cdact" onClick={() => onCelebrate?.()}>
          <span className="ua-cp-hero-stat__label">Monthly</span>
          <strong>{user.monthlyScore || 291}</strong>
          <span className="ua-cp-hero-stat__sub">Rank {user.monthlyRank || "1st of 24"}</span>
        </button>
      </div>

      <HealthProgressCarousel userId={user.n} onNavigate={onNavigate} />
    </div>
  );
}

function DailyActivityBlock({ onNavigate, onWaterHover }) {
  const [activeMetric, setActiveMetric] = useState(null);

  return (
    <div className="ua-cp-glance-block">
      <div className="ua-cp-daily-head">
        <div className="ua-section-label__title">Daily activity</div>
        <span className="ua-cp-daily-head__hint">Tap a metric for last 5 records</span>
      </div>
      <div className="ua-cp-metrics">
        {DAILY_METRICS.map((m) => {
          const color = METRIC_TONE[m.tone] || METRIC_TONE.blue;
          const isWater = m.id === "water";
          const pctClass = m.pct >= 100 ? " ua-cp-metric__pct--full" : "";
          return (
            <button
              key={m.id}
              type="button"
              className={`ua-cp-metric cdact${isWater ? " ua-cp-metric--water" : ""}`}
              onClick={() => setActiveMetric(m)}
              onMouseEnter={isWater ? () => onWaterHover?.(true, waterHydrationTip(m)) : undefined}
              onMouseLeave={isWater ? () => onWaterHover?.(false, "") : undefined}
              onFocus={isWater ? () => onWaterHover?.(true, waterHydrationTip(m)) : undefined}
              onBlur={isWater ? () => onWaterHover?.(false, "") : undefined}
            >
              <span className="cdbig">{m.icon}</span>
              <div className="ua-cp-metric__top">
                <span className="cdemoji ua-cp-metric__icon">{m.icon}</span>
                <span className="ua-cp-metric__name">{m.label}</span>
              </div>
              <div className="ua-cp-metric__value" style={{ color }}>{m.value}</div>
              <MiniBars values={m.bars} color={color} />
              <div className="ua-cp-metric__foot">
                <span className="ua-cp-metric__goal">Goal {m.goal}</span>
                <span className={`ua-cp-metric__pct${pctClass}`} style={{ color: m.pct >= 100 ? "#2b8f5b" : color }}>{m.pct}%</span>
              </div>
              <div className="ua-cp-metric__track"><span style={{ width: `${Math.min(m.pct, 100)}%`, background: color }} /></div>
            </button>
          );
        })}
      </div>
      {activeMetric ? (
        <DailyMetricModal
          metric={activeMetric}
          onClose={() => setActiveMetric(null)}
          onNavigate={onNavigate}
        />
      ) : null}
    </div>
  );
}

function SupplementsBlock({ onNavigate }) {
  return (
    <div className="ua-cp-glance-block">
      <div className="ua-cp-supp-head">
        <span className="ua-cp-supp-head__label">Nutrition · active supplements</span>
        <button type="button" className="ua-cp-supp-head__link" onClick={() => onNavigate?.("nutritions")}>
          5 active · Open plan ›
        </button>
      </div>
      <button type="button" className="ua-cp-supp-panel cdact" onClick={() => onNavigate?.("nutritions")}>
        <div className="ua-cp-supp-table__head">
          <div>Supplement</div><div>Dosage</div><div>Runs out · date</div>
        </div>
        {ACTIVE_SUPPLEMENTS.map((s) => (
          <div key={s.name} className="ua-cp-supp-table__row">
            <div className="ua-cp-supp-name">
              <span className={`ua-cp-supp-dot ua-cp-supp-dot--${s.dosages[0]?.tone || "morning"}`} />
              <div>
                <div className="ua-cp-supp-name__title">{s.name}</div>
                <div className="ua-cp-supp-name__sub">{s.note}</div>
              </div>
            </div>
            <div className="ua-cp-supp-dosages">
              {s.dosages.map((d) => <DosageBadge key={d.label} {...d} />)}
            </div>
            <div className="ua-cp-supp-expiry">
              <span>{s.date}</span>
              <span className={`ua-cp-days-left${s.urgent ? " ua-cp-days-left--urgent" : ""}`}>{s.daysLeft}d left</span>
            </div>
          </div>
        ))}
      </button>
    </div>
  );
}

function CommsBlock({ user, onToast, reminders, setReminders, onOpenList }) {
  const [message, setMessage] = useState("");
  const [reminder, setReminder] = useState("");
  const [reminderTime, setReminderTime] = useState("07:00");
  const [reminderFreq, setReminderFreq] = useState("Daily");

  return (
    <div className="ua-cp-comms-stack">
      <div className="ua-cp-comms__bar ua-cp-comms__bar--message">
        <span className="ua-cp-comms__label">💬 Message {user.name}</span>
        <input className="ua-cp-comms__input" placeholder="Write a message… pops up in their app" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-comms__action" onClick={() => { onToast("Message sent"); setMessage(""); }}>Send</button>
      </div>
      <div className="ua-cp-comms__bar ua-cp-comms__bar--reminders">
        <span className="ua-cp-comms__label">⏰ Reminders</span>
        <input className="ua-cp-comms__input ua-cp-comms__input--reminder" placeholder="Reminder (e.g. Take supplements)" value={reminder} onChange={(e) => setReminder(e.target.value)} />
        <input type="time" className="ua-cp-reminder-time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
        <select className="ua-cp-reminder-freq" value={reminderFreq} onChange={(e) => setReminderFreq(e.target.value)}>
          <option>Daily</option><option>Weekly</option><option>After lunch</option>
        </select>
        <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-comms__action" onClick={() => {
          if (reminder.trim()) {
            setReminders((r) => [...r, { id: Date.now(), text: reminder, freq: reminderFreq, time: reminderTime }]);
            setReminder("");
            onToast("Reminder set");
          }
        }}>Set</button>
        <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-comms__action" onClick={onOpenList}>List ({reminders.length})</button>
      </div>
    </div>
  );
}

function resolveOnboardingProgress(user, liveProgress) {
  if (liveProgress && Number.isFinite(liveProgress.done) && Number.isFinite(liveProgress.total)) {
    return {
      done: liveProgress.done,
      total: liveProgress.total,
      nextLabel: liveProgress.nextLabel || "",
      completed: Boolean(liveProgress.completed),
    };
  }

  const total = user?.onboardingTotal || 7;
  const done = user?.onboardingDone;
  if (done == null) {
    return { done: null, total, nextLabel: "", completed: false };
  }

  const completed = Boolean(user?.paidOnboardingCompleted) || done >= total;
  const nextLabel = completed
    ? ""
    : getNextOnboardingStepLabel(user?.paidOnboardingStepStatus)
      || String(user?.paidOnboardingStep || "").trim();

  return { done, total, nextLabel, completed };
}

function formatOnboardingLabel({ done, total, nextLabel, completed }) {
  if (done == null) return "—";
  if (completed) return `Complete · ${done}/${total} steps`;
  if (done === 0 && nextLabel) return `Not started · Next: ${nextLabel}`;
  if (done === 0) return `Not started · 0/${total} steps`;
  if (nextLabel) return `In progress · ${done}/${total} · Next: ${nextLabel}`;
  return `In progress · ${done}/${total} steps`;
}

function OnboardingSummary({ user, progress }) {
  const joinedLabel = user.joinedAgo || (user.ageDays === 0 ? "today" : user.ageDays > 0 ? `${user.ageDays} days ago` : "—");
  const onboardingLabel = formatOnboardingLabel(resolveOnboardingProgress(user, progress));
  return (
    <div className="ua-cp-onboard-summary">
      <div className="ua-cp-onboard-pill">
        <span className="ua-cp-onboard-pill__icon">📅</span>
        <div>
          <span className="ua-cp-onboard-pill__key">Joined</span>
          <strong>{joinedLabel}</strong>
        </div>
      </div>
      <div className="ua-cp-onboard-pill">
        <span className="ua-cp-onboard-pill__icon">🚀</span>
        <div>
          <span className="ua-cp-onboard-pill__key">Onboarding</span>
          <strong>{onboardingLabel}</strong>
        </div>
      </div>
    </div>
  );
}

/** Map User.paidOnboardingStepStatus keys → admin UI onboarding step numbers. */
const PAID_STATUS_TO_UI_STEP = {
  personalDetails: 1,
  profileSetup: 1,
  bodyMeasurement: 2,
  progressPhotos180: 2,
  medicalConditions: 3,
  internalParameter: 3,
  launch: 4,
};

function buildInitialDone(user) {
  const status = user?.paidOnboardingStepStatus;
  if (status && typeof status === "object") {
    const seed = {};
    Object.entries(PAID_STATUS_TO_UI_STEP).forEach(([key, stepN]) => {
      if (status[key] === "done" || status[key] === "skipped") {
        seed[stepN] = true;
      }
    });
    if (user.paidOnboardingCompleted) {
      ONBOARDING_STEPS.forEach((step) => {
        seed[step.n] = true;
      });
    }
    return seed;
  }

  const seed = { ...ONBOARDING_INITIAL_DONE };
  if (user.n !== 1 && user.onboardingDone) {
    ONBOARDING_STEPS.forEach((step, idx) => {
      if (idx < user.onboardingDone) seed[step.n] = true;
    });
  }
  return seed;
}

function buildInitialStepNotes(doneMap) {
  const notes = { ...ONBOARDING_STEP_NOTES };
  if (!doneMap[5]) delete notes[5];
  return notes;
}

function formatOnboardingStamp(date = new Date()) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function buildRcaSubmittedNote(by = "Admin desk") {
  return `RCA submitted by ${by} · ${formatOnboardingStamp()}`;
}

function priorStepsDone(steps, n) {
  return steps.filter((s) => s.n < n).every((s) => s.done);
}

function StepToggle({ done, current, onClick }) {
  return (
    <button
      type="button"
      className={`ua-cp-onboard-step__toggle${done ? " ua-cp-onboard-step__toggle--done" : current ? " ua-cp-onboard-step__toggle--current" : ""}`}
      title={done ? "Mark as not done" : "Mark complete"}
      onClick={onClick}
      aria-label={done ? "Mark step not done" : "Mark step complete"}
    >
      {done ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
      ) : null}
    </button>
  );
}

function resolveStepAction(step, steps) {
  const done = step.done;
  const ready = priorStepsDone(steps, step.n);

  if (step.action === "submit-rca") {
    if (done) return { label: "Undo", tone: "ghost" };
    if (ready) return { label: "Submit RCA", tone: "green" };
    return null;
  }
  if (step.action === "schedule-briefing") {
    if (ready) return { label: "Schedule briefing", tone: "green" };
    if (done) return { label: "Undo", tone: "ghost" };
    return null;
  }
  if (step.action === "schedule-hap") {
    if (ready) return { label: "Schedule HAP", tone: "green" };
    if (done) return { label: "Undo", tone: "ghost" };
    return null;
  }
  if (step.action === "schedule-initiation") {
    if (ready) return { label: "Schedule initiation", tone: "green" };
    if (done) return { label: "Undo", tone: "ghost" };
    return null;
  }
  if (done) {
    if (step.doneAction === "schedule-hap") return { label: "Schedule HAP", tone: "green" };
    return { label: "Undo", tone: "ghost" };
  }
  if (step.section) return { label: "Open ›", tone: "link" };
  return { label: "Mark done", tone: "ghost" };
}

function OnboardingStatusCard({ user, onToast, onNavigate, onProgressChange }) {
  const [doneMap, setDoneMap] = useState(() => buildInitialDone(user));
  const [stepNotes, setStepNotes] = useState(() => buildInitialStepNotes(buildInitialDone(user)));
  const [scheduleModal, setScheduleModal] = useState(null);
  const [remindOpen, setRemindOpen] = useState(false);

  useEffect(() => {
    const next = buildInitialDone(user);
    setDoneMap(next);
    setStepNotes(buildInitialStepNotes(next));
  }, [user?.id, user?.paidOnboardingCompleted, user?.onboardingDone, user?.paidOnboardingStepStatus]);

  const steps = useMemo(
    () => ONBOARDING_STEPS.map((step) => ({ ...step, done: !!doneMap[step.n] })),
    [doneMap],
  );

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((doneCount / total) * 100);
  const nextStep = steps.find((s) => !s.done);
  const currentStep = nextStep || steps[steps.length - 1];
  const remindMessage = nextStep
    ? buildOnboardingRemindMessage(user, nextStep.label)
    : "";

  useEffect(() => {
    onProgressChange?.({
      done: doneCount,
      total,
      nextLabel: nextStep?.label || "",
      completed: Boolean(user?.paidOnboardingCompleted) || doneCount >= total,
    });
  }, [doneCount, total, nextStep?.label, onProgressChange, user?.paidOnboardingCompleted]);

  const toggleStep = (n) => {
    setDoneMap((prev) => {
      const next = { ...prev };
      if (next[n]) delete next[n];
      else next[n] = true;
      return next;
    });
    if (n === 5) {
      setStepNotes((prev) => {
        const next = { ...prev };
        if (doneMap[5]) delete next[5];
        return next;
      });
    }
  };

  const handleStepAction = (step) => {
    if (step.done && step.doneAction !== "schedule-hap") {
      toggleStep(step.n);
      onToast(`Reopened · ${step.label}`);
      return;
    }
    if (step.done && step.doneAction === "schedule-hap") {
      setScheduleModal({
        title: "Schedule HAP session",
        defaultNote: "Health Action Plan session — we will set your plan together.",
        onSend: () => onToast("HAP session slots sent"),
      });
      return;
    }
    if (step.section) {
      onNavigate?.(step.section);
      return;
    }
    if (step.action === "submit-rca") {
      setDoneMap((prev) => ({ ...prev, [step.n]: true }));
      setStepNotes((prev) => ({ ...prev, [step.n]: buildRcaSubmittedNote() }));
      onToast(`RCA submitted for ${user.name}`);
      return;
    }
    if (step.action?.startsWith("schedule-")) {
      setScheduleModal({
        title: step.meetingTitle,
        defaultNote: step.meetingNote,
        onSend: () => {
          setDoneMap((prev) => ({ ...prev, [step.n]: true }));
          onToast(`${step.label} slots sent`);
        },
      });
      return;
    }
    toggleStep(step.n);
    onToast(`${step.label} completed`);
  };

  return (
    <>
      <div className="ua-cp-card ua-cp-onboard-card">
        <div className="ua-cp-onboard-card__head">
          <div className="ua-cp-onboard-card__title"><span>🧭</span> Onboarding status</div>
          <div className="ua-cp-onboard-card__actions">
            <span className="ua-cp-onboard-card__count">{doneCount} / {total} done</span>
            {nextStep ? (
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm ua-cp-onboard-card__remind"
                onClick={() => setRemindOpen(true)}
              >
                🔔 Remind
              </button>
            ) : null}
          </div>
        </div>
        {nextStep ? (
          <div className="ua-cp-onboard-next">Next step <strong>{nextStep.label}</strong></div>
        ) : null}
        <div className="ua-cp-onboard-stepper">
          {steps.map((step, index) => (
            <div key={step.n} className="ua-cp-onboard-seg">
              {index > 0 ? (
                <span
                  className={`ua-cp-onboard-seg__bar${steps[index - 1].done ? " ua-cp-onboard-seg__bar--done" : ""}`}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={`ua-cp-onboard-dot${step.done ? " ua-cp-onboard-dot--done" : step.n === currentStep.n ? " ua-cp-onboard-dot--current" : ""}`}
                title={step.label}
              >
                {step.done ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  step.n
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="ua-cp-onboard-progress-meta">
          <span>Step {currentStep.n} of {total} · {currentStep.label}</span>
          <strong>{pct}%</strong>
        </div>
        <div className="ua-cp-onboard-steps">
          {steps.map((step) => {
            const action = resolveStepAction(step, steps);
            const isCurrent = !step.done && step.n === currentStep.n;
            const note = stepNotes[step.n];
            return (
              <div
                key={step.n}
                className={`ua-cp-onboard-step${isCurrent ? " ua-cp-onboard-step--current" : ""}${note ? " ua-cp-onboard-step--has-note" : ""}`}
              >
                <StepToggle
                  done={step.done}
                  current={isCurrent}
                  onClick={() => toggleStep(step.n)}
                />
                <div className="ua-cp-onboard-step__copy">
                  <span className={`ua-cp-onboard-step__label${step.done ? " ua-cp-onboard-step__label--done" : ""}`}>
                    {step.n}. {step.label}
                  </span>
                  {note ? <div className="ua-cp-onboard-step__note">{note}</div> : null}
                </div>
                {action ? (
                  <button
                    type="button"
                    className={`ua-cp-onboard-step__btn ua-cp-onboard-step__btn--${action.tone}`}
                    onClick={() => handleStepAction(step)}
                  >
                    {action.label}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="ua-cp-onboard-footnote">Client-side steps sync from the app. RCA, HAP, briefing, letter and initiation are yours to submit.</p>
      </div>

      {scheduleModal ? (
        <ScheduleMeetingModal
          user={user}
          title={scheduleModal.title}
          defaultNote={scheduleModal.defaultNote}
          onClose={() => setScheduleModal(null)}
          onSend={() => {
            scheduleModal.onSend?.();
            setScheduleModal(null);
          }}
        />
      ) : null}

      {remindOpen && nextStep ? (
        <ClientRemindModal
          user={user}
          nextStepLabel={nextStep.label}
          defaultMessage={remindMessage}
          whatsapp={user.whatsapp}
          onClose={() => setRemindOpen(false)}
          onPush={() => {
            onToast(`Reminder pushed to ${user.name.split(" ")[0]}'s app`);
            setRemindOpen(false);
          }}
          onWhatsApp={() => {
            onToast(`WhatsApp sent to ${user.whatsapp}`);
            setRemindOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function RemindersModal({ user, reminders, onClose, onDelete }) {
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="reminders-title">
        <div className="ua-cp-modal__head">
          <div>
            <div id="reminders-title" className="ua-cp-modal__title">⏰ Scheduled reminders</div>
            <div className="ua-cp-modal__sub">Repeats in {user.name}&apos;s app</div>
          </div>
          <button type="button" className="ua-cp-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="ua-cp-modal__body">
          {reminders.map((r) => (
            <div key={r.id} className="ua-cp-reminder-item">
              <span className="ua-cp-reminder-item__icon">⏰</span>
              <div className="ua-cp-reminder-item__text">
                <div className="ua-cp-reminder-item__title">{r.text}</div>
                <div className="ua-cp-reminder-item__freq">{r.freq}</div>
              </div>
              <span className="ua-cp-reminder-item__time">{r.time}</span>
              <button type="button" className="ua-cp-reminder-item__del" onClick={() => onDelete(r.id)} aria-label="Delete">×</button>
            </div>
          ))}
        </div>
        <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-modal__cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export function AtAGlanceSection({ user, onToast, onNavigate }) {
  const inProgress = user.paidOnboardingCompleted
    ? false
    : (user.onboardingDone ?? 0) < (user.onboardingTotal ?? 7);
  const [viewMode, setViewMode] = useState(inProgress ? "onboarding" : "onboarded");
  useEffect(() => {
    setViewMode(inProgress ? "onboarding" : "onboarded");
  }, [inProgress, user?.id]);
  const [reminders, setReminders] = useState(DEFAULT_REMINDERS);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [rainActive, setRainActive] = useState(false);
  const [rainTip, setRainTip] = useState("");
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState(null);

  useEffect(() => {
    setOnboardingProgress(null);
  }, [user?.id]);

  function handleWaterHover(active, tip) {
    setRainActive(active);
    setRainTip(tip || "");
  }

  return (
    <div className={`ua-cp-section ua-cp-section--glance${rainActive ? " ua-cp-section--glance-rain" : ""}`}>
      {rainActive ? <GlanceRainOverlay /> : null}
      {rainActive && rainTip ? (
        <div className="ua-cp-glance-rain-tip" role="status">{rainTip}</div>
      ) : null}
      <GlanceHeader user={user} onOpenReview={() => setReviewOpen(true)} />
      <PreviewToggle mode={viewMode} onChange={setViewMode} />

      {viewMode === "onboarded" ? (
        <>
          <MetabolicSnapshot onNavigate={onNavigate} />
          <HealthCardsRow
            user={user}
            onNavigate={onNavigate}
            onCelebrate={() => setCelebrateOpen(true)}
          />
          <DailyActivityBlock onNavigate={onNavigate} onWaterHover={handleWaterHover} />
          <SupplementsBlock onNavigate={onNavigate} />
          <CommsBlock
            user={user}
            onToast={onToast}
            reminders={reminders}
            setReminders={setReminders}
            onOpenList={() => setRemindersOpen(true)}
          />
        </>
      ) : (
        <>
          <OnboardingSummary user={user} progress={onboardingProgress} />
          <OnboardingStatusCard
            user={user}
            onToast={onToast}
            onNavigate={onNavigate}
            onProgressChange={setOnboardingProgress}
          />
        </>
      )}

      {celebrateOpen ? (
        <ChampionCelebrationOverlay user={user} onClose={() => setCelebrateOpen(false)} />
      ) : null}

      {reviewOpen ? (
        <ReviewHistoryModal user={user} onClose={() => setReviewOpen(false)} onNavigate={onNavigate} />
      ) : null}

      {remindersOpen ? (
        <RemindersModal
          user={user}
          reminders={reminders}
          onClose={() => setRemindersOpen(false)}
          onDelete={(id) => setReminders((list) => list.filter((x) => x.id !== id))}
        />
      ) : null}
    </div>
  );
}
