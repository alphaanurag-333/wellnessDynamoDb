import { useState } from "react";
import {
  ACTIVE_SUPPLEMENTS,
  DAILY_METRICS,
  DEFAULT_REMINDERS,
  METABOLIC_SNAPSHOT,
  ONBOARDING_STEPS,
} from "../../data/userDetailData.js";

const METRIC_TONE = {
  blue: "#5e6ad2",
  teal: "#0d9488",
  gold: "#d4a017",
  sky: "#38bdf8",
  orange: "#ec7a45",
};

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

function GlanceHeader({ user }) {
  return (
    <div className="ua-cp-glance-head">
      <div>
        <h2 className="ua-cp-glance-head__title">At a Glance</h2>
        <p className="ua-cp-glance-head__sub">{user.name} · Joined {user.joinedAgo || "recently"}</p>
      </div>
      <div className="ua-cp-glance-head__badges">
        <button type="button" className="ua-cp-glance-badge ua-cp-glance-badge--review">
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

function MetabolicSnapshot({ onToast }) {
  return (
    <>
      <div className="ua-cp-metabolic__head">
        <span className="ua-cp-metabolic__label">Metabolic snapshot</span>
        <button type="button" className="ua-cp-metabolic__link" onClick={() => onToast("Opening full history")}>View full history ›</button>
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
      <div className="ua-cp-metabolic__targets">
        <button type="button" className="ua-cp-target-soft cdact">
          <span className="ua-cp-target-soft__key">Water target</span>
          <strong className="ua-cp-target-soft__val ua-cp-target-soft__val--blue">8 glasses</strong>
          <span className="ua-cp-target-soft__sub">Client set in app</span>
        </button>
        <button type="button" className="ua-cp-target-soft cdact">
          <span className="ua-cp-target-soft__key">Sleep target</span>
          <strong className="ua-cp-target-soft__val ua-cp-target-soft__val--purple">8 h</strong>
          <span className="ua-cp-target-soft__sub">Client set in app</span>
        </button>
      </div>
    </>
  );
}

function HealthCardsRow({ user, onToast }) {
  const score = user.lifestyleScore || 7.2;
  const ringPct = Math.min(100, (score / 10) * 100);
  return (
    <div className="ua-cp-health-band">
      <div className="ua-cp-health-band__left">
        <button type="button" className="ua-cp-health-stat cdact" onClick={() => onToast("Lifestyle history")}>
          <span className="ua-cp-health-stat__label">Lifestyle</span>
          <div className="cdlifering" style={{ background: `conic-gradient(#5e6ad2 ${ringPct * 3.6}deg, #e8edf5 0)` }}>
            <div className="cdlifering__inner"><span>{score}</span></div>
          </div>
          <span className="ua-cp-health-stat__link">History ›</span>
        </button>
        <button type="button" className="ua-cp-health-stat cdact" onClick={() => onToast("Prakriti history")}>
          <span className="ua-cp-health-stat__label">Prakriti</span>
          <span className="prakchip">🌿</span>
          <strong>{user.prakriti || "Vata"}</strong>
          <span className="ua-cp-health-stat__link">History ›</span>
        </button>
        <div className="ua-cp-score-stack">
          <div className="ua-cp-score-card">
            <span className="ua-cp-score-card__label">Daily</span>
            <strong>{user.dailyScore || 91}<span>/100</span></strong>
            <button type="button" className="ua-cp-score-card__link" onClick={() => onToast("DRF details")}>from DRF ›</button>
          </div>
          <div className="ua-cp-score-card">
            <span className="ua-cp-score-card__label">Monthly</span>
            <strong>{user.monthlyScore || 291}</strong>
            <span className="ua-cp-score-card__rank">Rank {user.monthlyRank || "1st of 24"}</span>
          </div>
        </div>
      </div>
      <div className="ua-cp-health-progress">
        <div className="ua-cp-health-progress__head">
          <span>Health progress</span>
          <div className="ua-cp-health-progress__nav">
            <button type="button" aria-label="Previous">‹</button>
            <button type="button" aria-label="Next">›</button>
          </div>
        </div>
        <div className="ua-cp-health-progress__body">
          <div className="ua-cp-health-progress__icon">🩸</div>
          <div>
            <div className="ua-cp-health-progress__goal">{user.healthGoal || user.goal}</div>
            <div className="ua-cp-health-progress__metric">{user.healthMetric || "HBA1C"}</div>
            <div className="ua-cp-health-progress__value">{user.healthValue || "6.8%"}</div>
            <div className="ua-cp-health-progress__delta">{user.healthDelta || "▼ 1.6 since start"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyActivityBlock({ onToast }) {
  return (
    <>
      <div className="ua-cp-daily-head">
        <div className="ua-section-label__title">Daily activity</div>
        <span className="ua-cp-daily-head__hint">Tap a metric for last 5 records</span>
      </div>
      <div className="ua-cp-metrics">
        {DAILY_METRICS.map((m) => {
          const color = METRIC_TONE[m.tone] || METRIC_TONE.blue;
          return (
            <button key={m.id} type="button" className="ua-cp-metric cdact" onClick={() => onToast(`${m.label} — last 5 records`)}>
              <span className="cdbig">{m.icon}</span>
              <div className="ua-cp-metric__top">
                <span className="cdemoji ua-cp-metric__icon">{m.icon}</span>
                <span className="ua-cp-metric__name">{m.label}</span>
              </div>
              <div className="ua-cp-metric__value" style={{ color }}>{m.value}</div>
              <MiniBars values={m.bars} color={color} />
              <div className="ua-cp-metric__foot">
                <span className="ua-cp-metric__goal">Goal {m.goal}</span>
                <span className="ua-cp-metric__pct" style={{ color }}>{m.pct}%</span>
              </div>
              <div className="ua-cp-metric__track"><span style={{ width: `${m.pct}%`, background: color }} /></div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function SupplementsBlock({ onToast }) {
  return (
    <>
      <div className="ua-cp-supp-head">
        <span className="ua-cp-supp-head__label">Nutrition · active supplements</span>
        <button type="button" className="ua-cp-supp-head__link" onClick={() => onToast("Opening supplement plan")}>
          5 active · Open plan ›
        </button>
      </div>
      <button type="button" className="ua-cp-supp-panel cdact" onClick={() => onToast("Opening supplement plan")}>
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
    </>
  );
}

function CommsBlock({ user, onToast, reminders, setReminders, onOpenList }) {
  const [message, setMessage] = useState("");
  const [reminder, setReminder] = useState("");
  const [reminderTime, setReminderTime] = useState("07:00");
  const [reminderFreq, setReminderFreq] = useState("Daily");

  return (
    <div className="ua-cp-comms ua-cp-comms--stack">
      <div className="ua-cp-comms__bar">
        <span className="ua-cp-comms__label">💬 Message {user.name}</span>
        <input className="ua-cp-comms__input" placeholder="Write a message… pops up in their app" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button type="button" className="ua-cp-btn ua-cp-btn--primary" onClick={() => { onToast("Message sent"); setMessage(""); }}>Send</button>
      </div>
      <div className="ua-cp-comms__bar">
        <span className="ua-cp-comms__label">⏰ Reminders</span>
        <input className="ua-cp-comms__input" placeholder="Reminder (e.g. Take supplements)" value={reminder} onChange={(e) => setReminder(e.target.value)} />
        <input type="time" className="ua-cp-reminder-time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
        <select className="ua-cp-reminder-freq" value={reminderFreq} onChange={(e) => setReminderFreq(e.target.value)}>
          <option>Daily</option><option>Weekly</option><option>After lunch</option>
        </select>
        <button type="button" className="ua-cp-btn ua-cp-btn--primary" onClick={() => {
          if (reminder.trim()) {
            setReminders((r) => [...r, { id: Date.now(), text: reminder, freq: reminderFreq, time: reminderTime }]);
            setReminder("");
            onToast("Reminder set");
          }
        }}>Set</button>
        <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onOpenList}>List ({reminders.length})</button>
      </div>
    </div>
  );
}

function OnboardingSummary({ user }) {
  return (
    <div className="ua-cp-onboard-summary">
      <div className="ua-cp-onboard-pill">
        <span className="ua-cp-onboard-pill__icon">📅</span>
        <div>
          <span className="ua-cp-onboard-pill__key">Joined</span>
          <strong>{user.joinedAgo || "3 days ago"}</strong>
        </div>
      </div>
      <div className="ua-cp-onboard-pill">
        <span className="ua-cp-onboard-pill__icon">🚀</span>
        <div>
          <span className="ua-cp-onboard-pill__key">Onboarding</span>
          <strong>In progress · {user.onboardingDone || 4}/{user.onboardingTotal || 11} steps</strong>
        </div>
      </div>
    </div>
  );
}

function stepActionLabel(action) {
  if (action === "open") return "Open ›";
  if (action === "undo") return "Undo";
  if (action === "submit-rca") return "Submit RCA";
  if (action === "schedule-briefing") return "Schedule briefing";
  if (action === "schedule-hap") return "Schedule HAP";
  if (action === "schedule-initiation") return "Schedule initiation";
  return null;
}

function OnboardingStatusCard({ user, onToast }) {
  const doneCount = user.onboardingDone || ONBOARDING_STEPS.filter((s) => s.done).length;
  const total = user.onboardingTotal || ONBOARDING_STEPS.length;
  const pct = user.onboardingPct || Math.round((doneCount / total) * 100);
  const nextStep = ONBOARDING_STEPS.find((s) => !s.done);

  return (
    <div className="ua-cp-card ua-cp-onboard-card">
      <div className="ua-cp-onboard-card__head">
        <div className="ua-cp-onboard-card__title"><span>🧭</span> Onboarding status</div>
        <div className="ua-cp-onboard-card__actions">
          <span className="ua-cp-onboard-card__count">{doneCount} / {total} done</span>
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => onToast("Reminder sent")}>🔔 Remind</button>
        </div>
      </div>
      {nextStep ? (
        <div className="ua-cp-onboard-next">Next step <strong>{nextStep.label}</strong></div>
      ) : null}
      <div className="ua-cp-onboard-stepper">
        {ONBOARDING_STEPS.map((step) => (
          <div key={step.n} className={`ua-cp-onboard-dot${step.done ? " ua-cp-onboard-dot--done" : step.n === nextStep?.n ? " ua-cp-onboard-dot--current" : ""}`}>
            {step.done ? "✓" : step.n}
          </div>
        ))}
      </div>
      <div className="ua-cp-onboard-progress-meta">
        <span>Step {nextStep?.n || 1} of {total} · {nextStep?.label || "Complete"}</span>
        <strong>{pct}%</strong>
      </div>
      <div className="ua-cp-onboard-steps">
        {ONBOARDING_STEPS.map((step) => {
          const action = stepActionLabel(step.action);
          return (
            <div key={step.n} className="ua-cp-onboard-step">
              <span className={`ua-cp-onboard-step__icon${step.done ? " ua-cp-onboard-step__icon--done" : ""}`}>{step.done ? "✓" : ""}</span>
              <span className="ua-cp-onboard-step__label">{step.n}. {step.label}</span>
              {action ? (
                <button
                  type="button"
                  className={`ua-cp-onboard-step__btn${step.action === "open" ? " ua-cp-onboard-step__btn--link" : step.action === "undo" ? " ua-cp-onboard-step__btn--ghost" : " ua-cp-onboard-step__btn--green"}`}
                  onClick={() => onToast(`${action} — ${step.label}`)}
                >
                  {action}
                </button>
              ) : <span />}
            </div>
          );
        })}
      </div>
      <p className="ua-cp-onboard-footnote">Client-side steps sync from the app. RCA, HAP, briefing, letter and initiation are yours to submit.</p>
    </div>
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

export function AtAGlanceSection({ user, onToast }) {
  const [viewMode, setViewMode] = useState("onboarded");
  const [reminders, setReminders] = useState(DEFAULT_REMINDERS);
  const [remindersOpen, setRemindersOpen] = useState(false);

  return (
    <div className="ua-cp-section ua-cp-section--glance">
      <GlanceHeader user={user} />
      <PreviewToggle mode={viewMode} onChange={setViewMode} />

      {viewMode === "onboarded" ? (
        <>
          <MetabolicSnapshot onToast={onToast} />
          <HealthCardsRow user={user} onToast={onToast} />
          <DailyActivityBlock onToast={onToast} />
          <SupplementsBlock onToast={onToast} />
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
          <OnboardingSummary user={user} />
          <OnboardingStatusCard user={user} onToast={onToast} />
        </>
      )}

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
