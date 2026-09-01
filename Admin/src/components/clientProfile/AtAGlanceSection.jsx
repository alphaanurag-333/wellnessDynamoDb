import { useEffect, useMemo, useState } from "react";
import {
  buildOnboardingRemindMessage,
  ONBOARDING_STEPS,
} from "../../data/userDetailData.js";
import {
  createUserReminder,
  deleteUserReminder,
  fetchUserAtAGlance,
  fetchUserCoachInsight,
  fetchUserReminders,
  getNextOnboardingStepLabel,
  saveUserCoachInsight,
} from "../../api/usersApi.js";
import {
  acceptOnboardingMeetingRequest,
  createOnboardingMeetingSlots,
  fetchOnboardingMeetings,
  patchOnboardingStep,
  pushOnboardingReminder,
  rejectOnboardingMeetingRequest,
  submitUserRca,
} from "../../api/onboardingApi.js";
import { ClientRemindModal } from "./ClientRemindModal.jsx";
import { ChampionCelebrationOverlay } from "./ChampionCelebrationOverlay.jsx";
import { useClientProfileArchived } from "./ClientProfileArchivedContext.jsx";
import { ReviewHistoryModal } from "./ReviewHistoryModal.jsx";
import { HealthProgressCarousel } from "./HealthProgressCarousel.jsx";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal.jsx";
import { ReviewRequestedTimesModal } from "./ReviewRequestedTimesModal.jsx";
import { isMockNumericId } from "../../utils/isMockNumericId.js";
import { DailyMetricModal } from "./DailyMetricModal.jsx";
import { useViewAs } from "../../context/ViewAsContext.jsx";

const EMPTY_SNAPSHOT = [
  { label: "Age", value: "—", tone: "default" },
  { label: "Height", value: "—", tone: "default" },
  { label: "Weight", value: "—", tone: "default" },
  { label: "BMR", value: "—", tone: "blue" },
  { label: "TDEE", value: "—", tone: "green" },
  { label: "Body fat", value: "—", tone: "gold" },
  { label: "Lean mass", value: "—", tone: "green" },
  { label: "Visceral", value: "—", tone: "default" },
];

const EMPTY_METRICS = [
  { id: "protein", label: "Protein", icon: "🥄", value: "—", goal: "—", pct: 0, bars: [0, 0, 0, 0, 0], tone: "blue", modal: { footerLabel: "Open Food & Water · full history ›", footerSection: "food", records: [] } },
  { id: "water", label: "Water", icon: "💧", value: "—", goal: "—", pct: 0, bars: [0, 0, 0, 0, 0], tone: "blue", modal: { footerLabel: "Open Water tracking · full history ›", footerSection: "food", records: [] } },
  { id: "steps", label: "Steps", icon: "👟", value: "—", goal: "—", pct: 0, bars: [0, 0, 0, 0, 0], tone: "teal", modal: { footerLabel: "Open BMS · steps history ›", footerSection: "bms", records: [] } },
  { id: "meditation", label: "Meditation", icon: "🧘", value: "—", goal: "—", pct: 0, bars: [0, 0, 0, 0, 0], tone: "gold", modal: { footerLabel: "Open Body, Mind & Soul · full history ›", footerSection: "bms", records: [] } },
  { id: "pranayam", label: "Pranayam", icon: "🌬️", value: "—", goal: "—", pct: 0, bars: [0, 0, 0, 0, 0], tone: "sky", modal: { footerLabel: "Open Body, Mind & Soul · full history ›", footerSection: "bms", records: [] } },
  { id: "exercise", label: "Exercise", icon: "🏃", value: "—", goal: "—", pct: 0, bars: [0, 0, 0, 0, 0], tone: "orange", modal: { footerLabel: "Open Body, Mind & Soul · full history ›", footerSection: "bms", records: [] } },
];

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

function padMeetingTime(date) {
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = date.getHours() >= 12 ? "PM" : "AM";
  return `${hours}:${minutes} ${meridiem}`;
}

function formatMeetingSlotLabel(startIso, endIso) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  const end = endIso ? new Date(endIso) : null;
  const date = `${String(start.getDate()).padStart(2, "0")} ${start.toLocaleString("en-GB", { month: "short" })}`;
  const range = end && !Number.isNaN(end.getTime())
    ? `${padMeetingTime(start)}–${padMeetingTime(end)}`
    : padMeetingTime(start);
  return `${date} · ${range}`;
}

function resolveRequestedSlots(meeting) {
  if (!meeting) return [];
  if (Array.isArray(meeting.requestedSlots) && meeting.requestedSlots.length) {
    return meeting.requestedSlots;
  }
  if (meeting.requestedStartAt && meeting.requestedEndAt) {
    return [{ id: "legacy", startAt: meeting.requestedStartAt, endAt: meeting.requestedEndAt }];
  }
  return [];
}

function resolveConfirmedSlot(meeting) {
  if (!meeting || meeting.status !== "confirmed") return null;
  const slots = Array.isArray(meeting.slots) ? meeting.slots : [];
  if (meeting.selectedSlotId) {
    const selected = slots.find((s) => String(s.id) === String(meeting.selectedSlotId));
    if (selected?.startAt) return selected;
  }
  if (meeting.confirmedStartAt && meeting.confirmedEndAt) {
    return {
      id: meeting.selectedSlotId || "confirmed",
      startAt: meeting.confirmedStartAt,
      endAt: meeting.confirmedEndAt,
    };
  }
  return slots[0] || null;
}

/** Prefer the live meeting for a step: confirmed → time_requested → slots_offered (newest first). */
function meetingForStep(meetings, stepKey) {
  const rows = (meetings || []).filter(
    (row) => row.stepKey === stepKey && ["confirmed", "time_requested", "slots_offered"].includes(row.status),
  );
  if (!rows.length) return null;
  const rank = { confirmed: 0, time_requested: 1, slots_offered: 2 };
  return [...rows].sort((a, b) => {
    const byStatus = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    return String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
  })[0];
}

function waterHydrationTip(metric) {
  const current = parseInt(String(metric.value).replace(/[^\d]/g, ""), 10);
  const goal = parseInt(String(metric.goal).replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(current) || !Number.isFinite(goal) || goal <= 0) {
    return "Hydration — no glasses logged today";
  }
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
      {/* <span className="ua-cp-preview-bar__label">Preview</span> */}
      <button type="button" className={`ua-cp-preview-tab${mode === "onboarding" ? " ua-cp-preview-tab--active" : ""}`} onClick={() => onChange("onboarding")}>Onboarding view</button>
      <button type="button" className={`ua-cp-preview-tab${mode === "onboarded" ? " ua-cp-preview-tab--active" : ""}`} onClick={() => onChange("onboarded")}>Onboarded view</button>
    </div>
  );
}

function MetabolicSnapshot({ snapshot, onNavigate }) {
  const rows = Array.isArray(snapshot) && snapshot.length ? snapshot : EMPTY_SNAPSHOT;
  return (
    <div className="ua-cp-glance-block">
      <div className="ua-cp-metabolic__head">
        <span className="ua-cp-metabolic__label">Metabolic snapshot</span>
        <button type="button" className="ua-cp-metabolic__link" onClick={() => onNavigate?.("body")}>View full history ›</button>
      </div>
      <div className="ua-cp-metabolic-row">
        {rows.map((m, i) => (
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

function HealthCardsRow({ user, glance, onNavigate, onCelebrate }) {
  const score = glance?.lifestyleScore != null ? glance.lifestyleScore : (user.lifestyleScore ?? null);
  const ringPct = score != null ? Math.min(100, (Number(score) / 10) * 100) : 0;
  const prakriti = glance?.prakriti || user.prakriti || "—";
  const dailyScore = glance?.dailyScore != null ? glance.dailyScore : (user.dailyScore ?? null);
  const monthlyScore = glance?.monthlyScore != null ? glance.monthlyScore : (user.monthlyScore ?? null);
  const monthlyRank = glance?.monthlyRank || user.monthlyRank || null;
  return (
    <div className="ua-cp-glance-block ua-cp-health-band">
      <div className="ua-cp-health-band__stats">
        <button type="button" className="ua-cp-health-stat cdact" onClick={() => onNavigate?.("launch")}>
          <span className="ua-cp-health-stat__label">Lifestyle</span>
          <div className="cdlifering" style={{ background: `conic-gradient(#5e6ad2 ${ringPct * 3.6}deg, #e8edf5 0)` }}>
            <div className="cdlifering__inner"><span>{score != null ? score : "—"}</span></div>
          </div>
          <span className="ua-cp-health-stat__link">History ›</span>
        </button>
        <button type="button" className="ua-cp-health-stat cdact" onClick={() => onNavigate?.("launch", { tab: "prakriti" })}>
          <span className="ua-cp-health-stat__label">Prakriti</span>
          <span className="prakchip"><span className="prakemoji">🧘</span> {prakriti}</span>
          <span className="ua-cp-health-stat__link ua-cp-health-stat__link--purple">History ›</span>
        </button>
      </div>

      <div className="ua-cp-hero-stats">
        <button type="button" className="ua-cp-hero-stat cdact" onClick={() => onNavigate?.("reflection")}>
          <span className="ua-cp-hero-stat__label">Daily</span>
          <strong>{dailyScore != null ? dailyScore : "—"}{dailyScore != null ? <span>/100</span> : null}</strong>
          <span className="ua-cp-hero-stat__sub">from DRF ›</span>
        </button>
        <span className="ua-cp-hero-stats__sep" aria-hidden="true" />
        <button type="button" className="ua-cp-hero-stat ua-cp-hero-stat--monthly cdact" onClick={() => onCelebrate?.()}>
          <span className="ua-cp-hero-stat__label">Monthly</span>
          <strong>{monthlyScore != null ? monthlyScore : "—"}</strong>
          <span className="ua-cp-hero-stat__sub">{monthlyRank || "No rank yet"}</span>
        </button>
      </div>

      <HealthProgressCarousel
        userId={user.id || user.n}
        programs={
          isMockNumericId(user?.id || user?.n)
            ? undefined
            : (glance?.healthProgressPrograms || [])
        }
        onNavigate={onNavigate}
      />
    </div>
  );
}

function DailyActivityBlock({ metrics, onNavigate, onWaterHover }) {
  const [activeMetric, setActiveMetric] = useState(null);
  const list = Array.isArray(metrics) && metrics.length ? metrics : EMPTY_METRICS;

  return (
    <div className="ua-cp-glance-block">
      <div className="ua-cp-daily-head">
        <div className="ua-section-label__title">Daily activity</div>
        <span className="ua-cp-daily-head__hint">Tap a metric for last 5 records</span>
      </div>
      <div className="ua-cp-metrics">
        {list.map((m) => {
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
              <MiniBars values={m.bars || [0, 0, 0, 0, 0]} color={color} />
              <div className="ua-cp-metric__foot">
                <span className="ua-cp-metric__goal">Goal {m.goal}</span>
                <span className={`ua-cp-metric__pct${pctClass}`} style={{ color: m.pct >= 100 ? "#2b8f5b" : color }}>{m.pct || 0}%</span>
              </div>
              <div className="ua-cp-metric__track"><span style={{ width: `${Math.min(m.pct || 0, 100)}%`, background: color }} /></div>
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

function SupplementsBlock({ supplements, onNavigate }) {
  const items = Array.isArray(supplements?.items) ? supplements.items : [];
  const activeCount = supplements?.activeCount ?? items.length;
  return (
    <div className="ua-cp-glance-block">
      <div className="ua-cp-supp-head">
        <span className="ua-cp-supp-head__label">Nutrition · active nutritions</span>
        <button type="button" className="ua-cp-supp-head__link" onClick={() => onNavigate?.("nutritions")}>
          {activeCount} active · Open plan ›
        </button>
      </div>
      <button type="button" className="ua-cp-supp-panel cdact" onClick={() => onNavigate?.("nutritions")}>
        <div className="ua-cp-supp-table__head">
          <div>Nutrition</div><div>Dosage</div><div>Runs out · date</div>
        </div>
        {items.length ? items.map((s) => (
          <div key={s.name} className="ua-cp-supp-table__row">
            <div className="ua-cp-supp-name">
              <span className={`ua-cp-supp-dot ua-cp-supp-dot--${s.dosages?.[0]?.tone || "morning"}`} />
              <div>
                <div className="ua-cp-supp-name__title">{s.name}</div>
                <div className="ua-cp-supp-name__sub">{s.note}</div>
              </div>
            </div>
            <div className="ua-cp-supp-dosages">
              {(s.dosages || []).map((d) => <DosageBadge key={d.label} {...d} />)}
            </div>
            <div className="ua-cp-supp-expiry">
              <span>{s.date}</span>
              {s.daysLeft != null ? (
                <span className={`ua-cp-days-left${s.urgent ? " ua-cp-days-left--urgent" : ""}`}>{s.daysLeft}d left</span>
              ) : null}
            </div>
          </div>
        )) : (
          <div className="ua-cp-supp-table__row">
            <div className="ua-cp-supp-name">
              <div>
                <div className="ua-cp-supp-name__title">No active nutritions</div>
                <div className="ua-cp-supp-name__sub">Assign dosages from Nutritions</div>
              </div>
            </div>
            <div className="ua-cp-supp-dosages" />
            <div className="ua-cp-supp-expiry"><span>—</span></div>
          </div>
        )}
      </button>
    </div>
  );
}

const COACH_MESSAGE_MAX = 500;
const REMINDER_NAME_MAX = 120;
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAY_CHIPS = [
  { i: 0, label: "S" },
  { i: 1, label: "M" },
  { i: 2, label: "T" },
  { i: 3, label: "W" },
  { i: 4, label: "T" },
  { i: 5, label: "F" },
  { i: 6, label: "S" },
];
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sameDaySet(a, b) {
  const left = [...(a || [])].sort((x, y) => x - y).join(",");
  const right = [...(b || [])].sort((x, y) => x - y).join(",");
  return left === right;
}

function formatReminderDays(days) {
  const list = Array.isArray(days) ? days.map(Number).filter((d) => d >= 0 && d <= 6) : [];
  if (!list.length) return "No days";
  if (sameDaySet(list, ALL_WEEKDAYS)) return "Daily";
  if (sameDaySet(list, [1, 2, 3, 4, 5])) return "Weekdays";
  if (sameDaySet(list, [0, 6])) return "Weekends";
  return list.sort((a, b) => a - b).map((d) => WEEKDAY_NAMES[d]).join(", ");
}

function formatReminderTime(time) {
  const raw = String(time || "").trim();
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return raw || "—";
  const hour = Number(match[1]);
  const minute = match[2];
  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${meridiem}`;
}

function formatCoachInsightTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function CommsBlock({ user, onToast, reminders, setReminders, onOpenList, canEdit = true }) {
  const userId = String(user?.id || "").trim();
  const isMock = isMockNumericId(userId);
  const [message, setMessage] = useState("");
  const [liveInsight, setLiveInsight] = useState(null);
  const [sending, setSending] = useState(false);
  const [reminder, setReminder] = useState("");
  const [reminderTime, setReminderTime] = useState("07:00");
  const [reminderDays, setReminderDays] = useState(ALL_WEEKDAYS);
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    if (!userId || isMock) {
      setMessage("");
      setLiveInsight(null);
      return undefined;
    }

    let cancelled = false;
    fetchUserCoachInsight(userId)
      .then((insight) => {
        if (cancelled) return;
        setLiveInsight(insight || null);
        setMessage(insight?.message || "");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isMock, userId]);

  const sendCoachMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      onToast("Write a message first");
      return;
    }
    if (trimmed.length > COACH_MESSAGE_MAX) {
      onToast(`Message must be at most ${COACH_MESSAGE_MAX} characters`);
      return;
    }
    if (isMock) {
      onToast("Demo profiles cannot send messages.");
      return;
    }

    setSending(true);
    try {
      const insight = await saveUserCoachInsight(userId, trimmed);
      setLiveInsight(insight);
      setMessage(insight?.message || trimmed);
      onToast("Message sent — it will show on their Heal page");
    } catch (err) {
      onToast(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const setCoachReminder = async () => {
    const name = reminder.trim();
    if (!name) {
      onToast("Write a reminder first");
      return;
    }
    const time = String(reminderTime || "").slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(time)) {
      onToast("Choose a reminder time");
      return;
    }
    if (!reminderDays.length) {
      onToast("Select at least one day");
      return;
    }
    if (isMock) {
      onToast("Demo profiles cannot set reminders.");
      return;
    }

    setSavingReminder(true);
    try {
      const created = await createUserReminder(userId, {
        name,
        time,
        days: reminderDays,
        isActive: true,
      });
      if (created) setReminders((list) => [created, ...list]);
      setReminder("");
      onToast("Reminder set — it will show in their app");
    } catch (err) {
      onToast(err?.message || "Failed to set reminder");
    } finally {
      setSavingReminder(false);
    }
  };

  return (
    <div className="ua-cp-comms-stack">
      {canEdit ? (
      <>
      <div className="ua-cp-comms__bar ua-cp-comms__bar--message">
        <span className="ua-cp-comms__label">💬 Message {user.name}</span>
        <input
          className="ua-cp-comms__input"
          placeholder="Write a message… pops up in their app"
          maxLength={COACH_MESSAGE_MAX}
          value={message}
          disabled={sending}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendCoachMessage();
            }
          }}
        />
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--primary ua-cp-comms__action"
          disabled={sending}
          onClick={sendCoachMessage}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
      {liveInsight?.message ? (
        <p className="ua-cp-comms__live">
          Live on Heal page
          {liveInsight.updatedAt ? ` · ${formatCoachInsightTime(liveInsight.updatedAt)}` : ""}
        </p>
      ) : null}
      <div className="ua-cp-comms__bar ua-cp-comms__bar--reminders">
        <span className="ua-cp-comms__label">⏰ Reminders</span>
        <input
          className="ua-cp-comms__input ua-cp-comms__input--reminder"
          placeholder="Reminder (e.g. Take nutritions)"
          maxLength={REMINDER_NAME_MAX}
          value={reminder}
          disabled={savingReminder}
          onChange={(e) => setReminder(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setCoachReminder();
            }
          }}
        />
        <input
          type="time"
          className="ua-cp-reminder-time"
          value={reminderTime}
          disabled={savingReminder}
          onChange={(e) => setReminderTime(e.target.value)}
        />
        <div className="ua-cp-reminder-days" role="group" aria-label="Repeat on">
          {WEEKDAY_CHIPS.map((day) => {
            const on = reminderDays.includes(day.i);
            return (
              <button
                key={day.i}
                type="button"
                className={`ua-cp-reminder-day${on ? " ua-cp-reminder-day--on" : ""}`}
                aria-pressed={on}
                disabled={savingReminder}
                onClick={() => setReminderDays((current) => (
                  current.includes(day.i)
                    ? current.filter((d) => d !== day.i)
                    : [...current, day.i].sort((a, b) => a - b)
                ))}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--primary ua-cp-comms__action"
          disabled={savingReminder}
          onClick={setCoachReminder}
        >
          {savingReminder ? "Saving…" : "Set"}
        </button>
        <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-comms__action" onClick={onOpenList}>
          List ({reminders.length})
        </button>
      </div>
      </>
      ) : (
        <p className="ua-cp-placeholder__note">You do not have permission to send messages or set reminders.</p>
      )}
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
  bodyAnalytics: 2,
  internalParameter: 3,
  launch: 4,
  rca: 5,
  reportsBriefing: 6,
  hap: 7,
  protocolSettings: 8,
  commitmentLetter: 9,
  programInitiation: 10,
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

  // Live only: never seed Madhupriya demo steps 1–5 as complete.
  const seed = {};
  const doneCount = Number(user?.onboardingDone) || 0;
  if (doneCount > 0) {
    ONBOARDING_STEPS.forEach((step, idx) => {
      if (idx < doneCount) seed[step.n] = true;
    });
  }
  return seed;
}

function buildInitialStepNotes(doneMap) {
  // Do not copy ONBOARDING_STEP_NOTES seed stamps — only session/API notes.
  void doneMap;
  return {};
}

function formatOnboardingStamp(date = new Date()) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function buildRcaSubmittedNote(by = "Admin desk") {
  return `RCA submitted by ${by} · ${formatOnboardingStamp()}`;
}

function StepToggle({ done, current, onClick }) {
  const className = `ua-cp-onboard-step__toggle${done ? " ua-cp-onboard-step__toggle--done" : current ? " ua-cp-onboard-step__toggle--current" : ""}`;
  if (!onClick) {
    return (
      <span className={className} aria-hidden="true">
        {done ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        ) : null}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={className}
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

/** Per-step coach actions — always shown for pending steps (Figma At a Glance). */
function resolveStepAction(step) {
  if (step.done) {
    return { label: "Undo", tone: "ghost" };
  }
  if (step.action === "submit-rca") {
    return { label: "Submit RCA", tone: "green" };
  }
  if (step.action === "schedule-launch") {
    return { label: "Schedule LAUNCH", tone: "green" };
  }
  if (step.action === "schedule-briefing") {
    return { label: "Schedule briefing", tone: "green" };
  }
  if (step.action === "schedule-hap") {
    return { label: "Schedule HAP", tone: "green" };
  }
  if (step.action === "schedule-initiation") {
    return { label: "Schedule initiation", tone: "green" };
  }
  if (step.section) return { label: "Open ›", tone: "link" };
  return { label: "Mark done", tone: "ghost" };
}

function OnboardingStatusCard({
  user,
  onToast,
  onNavigate,
  onProgressChange,
  onUserUpdated,
  canEdit = true,
  canCalEdit = true,
  canRemind = true,
}) {
  const [doneMap, setDoneMap] = useState(() => buildInitialDone(user));
  const [stepNotes, setStepNotes] = useState(() => buildInitialStepNotes(buildInitialDone(user)));
  const [scheduleModal, setScheduleModal] = useState(null);
  const [reviewRequestModal, setReviewRequestModal] = useState(null);
  const [rcaOpen, setRcaOpen] = useState(false);
  const [rcaNotes, setRcaNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [remindBusy, setRemindBusy] = useState(false);
  const [remindBusyWhatsApp, setRemindBusyWhatsApp] = useState(false);
  const [meetings, setMeetings] = useState([]);

  const loadMeetings = () => {
    if (!user?.id || String(user.id).match(/^\d+$/)) return;
    fetchOnboardingMeetings(user.id)
      .then((rows) => setMeetings(rows || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadMeetings();
  }, [user?.id]);

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

  const persistStep = async (stepKey, status) => {
    const n = PAID_STATUS_TO_UI_STEP[stepKey];
    if (!user?.id || String(user.id).match(/^\d+$/)) {
      setDoneMap((prev) => {
        const next = { ...prev };
        if (status === "done") next[n] = true;
        else delete next[n];
        return next;
      });
      return;
    }
    setBusy(true);
    try {
      const data = await patchOnboardingStep(user.id, stepKey, status);
      const nextStatus = data?.paidOnboardingStepStatus || {
        ...user.paidOnboardingStepStatus,
        [stepKey]: status,
      };
      const saved = String(nextStatus?.[stepKey] || "").toLowerCase();
      if (status === "pending" && saved === "done") {
        throw new Error(`Could not reopen ${stepKey}. Try again.`);
      }
      const doneCountFromApi = Number(data?.completedStepsCount);
      const onboardingDone = Number.isFinite(doneCountFromApi)
        ? doneCountFromApi
        : Object.keys(PAID_STATUS_TO_UI_STEP).filter(
          (key) => nextStatus?.[key] === "done" || nextStatus?.[key] === "skipped",
        ).length;
      setDoneMap((prev) => {
        const next = { ...prev };
        if (status === "done" || saved === "done" || saved === "skipped") next[n] = true;
        else delete next[n];
        return next;
      });
      onUserUpdated?.({
        ...user,
        paidOnboardingStepStatus: nextStatus,
        paidOnboardingCompleted: Boolean(data?.paidOnboardingCompleted),
        onboardingDone,
        onboardingPct: Math.round((onboardingDone / ONBOARDING_STEPS.length) * 100),
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleStep = async (n) => {
    const step = ONBOARDING_STEPS.find((s) => s.n === n);
    if (!step?.key) return;
    const currentlyDone = !!doneMap[n];
    await persistStep(step.key, currentlyDone ? "pending" : "done");
    if (n === 5 && currentlyDone) {
      setStepNotes((prev) => {
        const next = { ...prev };
        delete next[5];
        return next;
      });
    }
  };

  const handleStepAction = async (step) => {
    if (step.done) {
      try {
        await toggleStep(step.n);
        onToast(`Reopened · ${step.label}`);
      } catch (err) {
        onToast(err?.message || "Failed to reopen step");
      }
      return;
    }
    if (step.section && !step.action) {
      onNavigate?.(step.section);
      return;
    }
    if (step.action === "submit-rca") {
      setRcaOpen(true);
      return;
    }
    if (step.action?.startsWith("schedule-")) {
      if (!canCalEdit) {
        onToast("You do not have permission to schedule meetings");
        return;
      }
      const existing = meetings.find((row) => (
        row.stepKey === step.key
        && ["slots_offered", "time_requested"].includes(row.status)
      ));
      setScheduleModal({
        title: step.meetingTitle,
        defaultNote: step.meetingNote,
        stepKey: step.key,
        meeting: existing || null,
      });
      return;
    }
    try {
      await toggleStep(step.n);
      onToast(`${step.label} completed`);
    } catch (err) {
      onToast(err?.message || "Failed to update step");
    }
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
                className="backgrounrd ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm ua-cp-onboard-card__remind"
                disabled={!canRemind || remindBusy || remindBusyWhatsApp}
                title={canRemind ? "Remind client" : "You do not have permission to send reminders"}
                onClick={() => {
                  if (!canRemind) {
                    onToast("You do not have permission to send reminders");
                    return;
                  }
                  setRemindOpen(true);
                }}
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
            <div
              key={step.n}
              className={`ua-cp-onboard-seg${index > 0 && steps[index - 1].done ? " ua-cp-onboard-seg--prev-done" : ""}`}
            >
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
            const action = resolveStepAction(step);
            const isCurrent = !step.done && step.n === currentStep.n;
            const note = stepNotes[step.n];
            const meeting = meetingForStep(meetings, step.key);
            const requestedSlots = meeting?.status === "time_requested" ? resolveRequestedSlots(meeting) : [];
            const requestedTimeLabels = requestedSlots
              .map((slot) => formatMeetingSlotLabel(slot.startAt, slot.endAt))
              .filter(Boolean);
            const confirmedSlot = resolveConfirmedSlot(meeting);
            const confirmedTimeLabel = confirmedSlot
              ? formatMeetingSlotLabel(confirmedSlot.startAt, confirmedSlot.endAt)
              : "";
            const meetingNote = meeting?.status === "slots_offered"
              ? "Slots offered — waiting for client"
              : meeting?.status === "time_requested"
                ? requestedSlots.length > 1
                  ? `Client requested ${requestedSlots.length} times`
                  : requestedTimeLabels[0]
                    ? `Client requested ${requestedTimeLabels[0]}`
                    : "Client requested another time"
                : meeting?.status === "confirmed"
                  ? confirmedTimeLabel
                    ? `Meeting confirmed · ${confirmedTimeLabel}`
                    : "Meeting confirmed"
                  : null;
            const showScheduleAction = Boolean(
              action
              && !(meeting && ["slots_offered", "time_requested", "confirmed"].includes(meeting.status)),
            );
            return (
              <div
                key={step.n}
                className={`ua-cp-onboard-step${isCurrent ? " ua-cp-onboard-step--current" : ""}${note || meetingNote ? " ua-cp-onboard-step--has-note" : ""}`}
              >
                <StepToggle
                  done={step.done}
                  current={isCurrent}
                  onClick={canEdit ? () => {
                    toggleStep(step.n).catch((err) => {
                      onToast(err?.message || "Failed to update step");
                    });
                  } : undefined}
                />
                <div className="ua-cp-onboard-step__copy">
                  <span className={`ua-cp-onboard-step__label${step.done ? " ua-cp-onboard-step__label--done" : ""}`}>
                    {step.n}. {step.label}
                  </span>
                  {note ? <div className="ua-cp-onboard-step__note">{note}</div> : null}
                  {meetingNote ? <div className="ua-cp-onboard-step__note">{meetingNote}</div> : null}
                </div>
                {canCalEdit && meeting?.status === "time_requested" ? (
                  <div className="ua-cp-onboard-step__btns">
                    <button
                      type="button"
                      className="ua-cp-onboard-step__btn ua-cp-onboard-step__btn--green"
                      disabled={busy}
                      onClick={() => {
                        setReviewRequestModal({
                          meeting,
                          stepLabel: step.label,
                          slots: requestedSlots,
                        });
                      }}
                    >
                      {requestedSlots.length > 1 ? "Review times" : "Accept time"}
                    </button>
                    <button
                      type="button"
                      className="ua-cp-onboard-step__btn ua-cp-onboard-step__btn--ghost"
                      disabled={busy}
                      onClick={async () => {
                        try {
                          setBusy(true);
                          await rejectOnboardingMeetingRequest(user.id, meeting.id);
                          onToast("Request rejected");
                          loadMeetings();
                        } catch (err) {
                          onToast(err?.message || "Failed to reject request");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : canCalEdit && meeting?.status === "slots_offered" ? (
                  <button
                    type="button"
                    className="ua-cp-onboard-step__btn ua-cp-onboard-step__btn--green"
                    disabled={busy}
                    onClick={() => handleStepAction(step)}
                  >
                    Offer more slots
                  </button>
                ) : showScheduleAction ? (
                  <button
                    type="button"
                    className={`ua-cp-onboard-step__btn ua-cp-onboard-step__btn--${action.tone}`}
                    disabled={
                      busy
                      || (step.done && !canEdit)
                      || (!step.done && step.action?.startsWith("schedule-") && !canCalEdit && !canEdit)
                      || (!step.done && step.action === "submit-rca" && !canEdit)
                      || (!step.done && !step.action && !canEdit && !step.section)
                    }
                    onClick={() => {
                      if (step.done && !canEdit) {
                        onToast("You do not have permission to update onboarding steps");
                        return;
                      }
                      handleStepAction(step);
                    }}
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
          existingMeeting={
            meetings.find((row) => (
              row.stepKey === scheduleModal.stepKey
              && ["slots_offered", "time_requested"].includes(row.status)
            )) || scheduleModal.meeting || null
          }
          onClose={() => setScheduleModal(null)}
          onSend={async (payload) => {
            try {
              setBusy(true);
              await createOnboardingMeetingSlots(user.id, {
                stepKey: scheduleModal.stepKey,
                slots: (payload?.slots || []).map((s) => ({
                  startAt: s.startAt,
                  endAt: s.endAt,
                })),
                note: payload?.note || "",
                hold: payload?.hold || "24 hours",
                durationMinutes: payload?.duration,
              });
              onToast(`${scheduleModal.title.replace("Schedule ", "")} slots sent`);
              setScheduleModal(null);
              loadMeetings();
            } catch (err) {
              onToast(err?.message || "Failed to send slots");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {reviewRequestModal ? (
        <ReviewRequestedTimesModal
          userName={user.name}
          stepLabel={reviewRequestModal.stepLabel}
          slots={reviewRequestModal.slots}
          busy={busy}
          onClose={() => {
            if (!busy) setReviewRequestModal(null);
          }}
          onAccept={async (slot) => {
            try {
              setBusy(true);
              const updated = await acceptOnboardingMeetingRequest(user.id, reviewRequestModal.meeting.id, {
                requestedSlotId: slot.id,
                startAt: slot.startAt,
                endAt: slot.endAt,
              });
              if (updated?.id) {
                setMeetings((prev) => {
                  const others = (prev || []).filter((row) => row.id !== updated.id);
                  return [updated, ...others];
                });
              }
              onToast("Requested time accepted");
              setReviewRequestModal(null);
              loadMeetings();
            } catch (err) {
              onToast(err?.message || "Failed to accept request");
            } finally {
              setBusy(false);
            }
          }}
          onReject={async () => {
            try {
              setBusy(true);
              await rejectOnboardingMeetingRequest(user.id, reviewRequestModal.meeting.id);
              onToast("Request rejected");
              setReviewRequestModal(null);
              loadMeetings();
            } catch (err) {
              onToast(err?.message || "Failed to reject request");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {rcaOpen ? (
        <div className="ua-cp-modal-backdrop" onClick={() => setRcaOpen(false)} role="presentation">
          <div className="ua-cp-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="ua-cp-modal__head">
              <div className="ua-cp-modal__title">Submit RCA</div>
              <button type="button" className="ua-cp-modal__close" onClick={() => setRcaOpen(false)}>×</button>
            </div>
            <div className="ua-cp-modal__body">
              <textarea
                className="ua-cp-launch-modal__note"
                rows={6}
                value={rcaNotes}
                onChange={(e) => setRcaNotes(e.target.value)}
                placeholder="Root cause analysis notes"
              />
            </div>
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--primary"
              disabled={busy || !rcaNotes.trim()}
              onClick={async () => {
                try {
                  setBusy(true);
                  await submitUserRca(user.id, { notes: rcaNotes.trim() });
                  setStepNotes((prev) => ({ ...prev, 5: buildRcaSubmittedNote() }));
                  onToast(`RCA submitted for ${user.name}`);
                  setRcaOpen(false);
                  setRcaNotes("");
                  onUserUpdated?.({
                    ...user,
                    paidOnboardingStepStatus: {
                      ...(user.paidOnboardingStepStatus || {}),
                      rca: "done",
                    },
                  });
                } catch (err) {
                  onToast(err?.message || "Failed to submit RCA");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Submit RCA
            </button>
          </div>
        </div>
      ) : null}

      {remindOpen && nextStep ? (
        <ClientRemindModal
          user={user}
          nextStepLabel={nextStep.label}
          defaultMessage={remindMessage}
          whatsapp={user.whatsapp}
          busyPush={remindBusy}
          busyWhatsApp={remindBusyWhatsApp}
          onClose={() => {
            if (!remindBusy && !remindBusyWhatsApp) setRemindOpen(false);
          }}
          onPush={async (message) => {
            if (!user?.id || remindBusy || remindBusyWhatsApp) return;
            setRemindBusy(true);
            try {
              const data = await pushOnboardingReminder(user.id, {
                message,
                stepLabel: nextStep.label,
              });
              onToast(data?.message || `Reminder pushed to ${user.name.split(" ")[0]}'s app`);
              setRemindOpen(false);
            } catch (err) {
              onToast(err?.message || "Failed to push reminder");
            } finally {
              setRemindBusy(false);
            }
          }}
          onWhatsApp={async (message) => {
            if (!user?.id || remindBusy || remindBusyWhatsApp) return;
            const body = String(message || "").trim();
            if (!body) {
              onToast("Write a reminder message first");
              return;
            }
            setRemindBusyWhatsApp(true);
            try {
              const data = await pushOnboardingReminder(user.id, {
                message: body,
                stepLabel: nextStep.label,
                channel: "whatsapp",
              });
              onToast(data?.message || `WhatsApp sent to ${user.whatsapp || user.name}`);
              setRemindOpen(false);
            } catch (err) {
              onToast(err?.message || "Failed to send WhatsApp");
            } finally {
              setRemindBusyWhatsApp(false);
            }
          }}
        />
      ) : null}
    </>
  );
}

function RemindersModal({ user, reminders, deletingId, onClose, onDelete }) {
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
          {reminders.length ? reminders.map((r) => (
            <div key={r.id} className={`ua-cp-reminder-item${r.isActive === false ? " ua-cp-reminder-item--off" : ""}`}>
              <span className="ua-cp-reminder-item__icon">⏰</span>
              <div className="ua-cp-reminder-item__text">
                <div className="ua-cp-reminder-item__title">{r.name || r.text}</div>
                <div className="ua-cp-reminder-item__freq">
                  {formatReminderDays(r.days)}
                  {r.isCoachAssigned ? " · Coach assigned" : ""}
                  {r.isActive === false ? " · Off" : ""}
                </div>
              </div>
              <span className="ua-cp-reminder-item__time">{formatReminderTime(r.time)}</span>
              <button
                type="button"
                className="ua-cp-reminder-item__del"
                disabled={deletingId === r.id}
                onClick={() => onDelete(r.id)}
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          )) : (
            <p className="ua-cp-reminder-empty">No reminders yet. Set one above and it will appear in their app.</p>
          )}
        </div>
        <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-modal__cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export function AtAGlanceSection({ user, onToast, onNavigate, onUserUpdated }) {
  const { can, isAdminView } = useViewAs();
  const archived = useClientProfileArchived();
  const canEditClient = !archived && (isAdminView || can("console.cl.edit"));
  const canCalEdit = !archived && (isAdminView || can("console.cal.edit") || can("console.cal.create"));
  const canRemindClient = !archived && (canEditClient || canCalEdit || can("console.diet.edit"));
  const inProgress = user.paidOnboardingCompleted
    ? false
    : (user.onboardingDone ?? 0) < (user.onboardingTotal ?? 7);
  const [viewMode, setViewMode] = useState(inProgress ? "onboarding" : "onboarded");
  useEffect(() => {
    setViewMode(inProgress ? "onboarding" : "onboarded");
  }, [inProgress, user?.id]);
  const [reminders, setReminders] = useState([]);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [deletingReminderId, setDeletingReminderId] = useState(null);
  const [rainActive, setRainActive] = useState(false);
  const [rainTip, setRainTip] = useState("");
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState(null);
  const [glance, setGlance] = useState(null);
  const [glanceLoading, setGlanceLoading] = useState(false);

  useEffect(() => {
    setOnboardingProgress(null);
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || isMockNumericId(userId)) {
      setReminders([]);
      return undefined;
    }

    let cancelled = false;
    fetchUserReminders(userId)
      .then((rows) => {
        if (!cancelled) setReminders(rows || []);
      })
      .catch(() => {
        if (!cancelled) setReminders([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || isMockNumericId(userId)) {
      setGlance(null);
      setGlanceLoading(false);
      return undefined;
    }

    let cancelled = false;
    setGlanceLoading(true);
    fetchUserAtAGlance(userId)
      .then((payload) => {
        if (!cancelled) setGlance(payload);
      })
      .catch((err) => {
        if (!cancelled) {
          setGlance(null);
          onToast?.(err?.message || "Failed to load At a Glance");
        }
      })
      .finally(() => {
        if (!cancelled) setGlanceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onToast, user?.id]);

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
          {glanceLoading ? (
            <p className="ua-page-head__sub" style={{ padding: "8px 0" }}>Loading live metrics…</p>
          ) : null}
          <MetabolicSnapshot snapshot={glance?.metabolicSnapshot} onNavigate={onNavigate} />
          <HealthCardsRow
            user={user}
            glance={glance}
            onNavigate={onNavigate}
            onCelebrate={() => setCelebrateOpen(true)}
          />
          <DailyActivityBlock
            metrics={glance?.dailyMetrics}
            onNavigate={onNavigate}
            onWaterHover={handleWaterHover}
          />
          <SupplementsBlock supplements={glance?.supplements} onNavigate={onNavigate} />
          <CommsBlock
            user={user}
            onToast={onToast}
            reminders={reminders}
            setReminders={setReminders}
            onOpenList={() => setRemindersOpen(true)}
            canEdit={canEditClient}
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
            onUserUpdated={onUserUpdated}
            canEdit={canEditClient}
            canCalEdit={canCalEdit}
            canRemind={canRemindClient}
          />
        </>
      )}

      {celebrateOpen ? (
        <ChampionCelebrationOverlay user={user} onClose={() => setCelebrateOpen(false)} />
      ) : null}

      {reviewOpen ? (
        <ReviewHistoryModal
          user={user}
          onClose={() => setReviewOpen(false)}
          onNavigate={onNavigate}
        />
      ) : null}

      {remindersOpen ? (
        <RemindersModal
          user={user}
          reminders={reminders}
          deletingId={deletingReminderId}
          onClose={() => setRemindersOpen(false)}
          onDelete={async (id) => {
            if (isMockNumericId(user?.id)) {
              onToast("Demo profiles cannot delete reminders.");
              return;
            }
            setDeletingReminderId(id);
            try {
              await deleteUserReminder(user.id, id);
              setReminders((list) => list.filter((x) => x.id !== id));
              onToast("Reminder deleted");
            } catch (err) {
              onToast(err?.message || "Failed to delete reminder");
            } finally {
              setDeletingReminderId(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
