import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";
import { PillTabs } from "../shared.jsx";
import { FoodWaterHistoryPicker } from "./FoodDatePicker.jsx";
import {
  BMS_GOALS,
  BMS_SLEEP_TARGET_HISTORY,
  buildHeartChartFromHistory,
  buildSleepChartFromHistory,
  buildSleepSummaryFromToday,
  buildStepsChartFromHistory,
  formatStepsLabel,
  isHeartOutOfZone,
} from "../../data/bmsData.js";
import { formatFoodDateInput, localToday } from "../../data/foodData.js";
import {
  fetchUserHeartRateTracking,
  fetchUserSleepTracking,
  fetchUserStepsTracking,
  updateUserBmsTracking,
} from "../../api/bmsTrackingApi.js";
import { fetchUser } from "../../api/usersApi.js";
import {
  adminListWellnessLibrary,
  assignUserWellnessItems,
  listUserWellnessAssignments,
  unassignUserWellnessItem,
} from "../../api/wellnessLibraryApi.js";
import { isMockNumericId } from "../../utils/isMockNumericId.js";

function isLiveUserId(userId) {
  return Boolean(userId) && !isMockNumericId(userId);
}

function defaultBmsRange(today = localToday()) {
  const to = new Date(today);
  const from = new Date(today);
  from.setDate(from.getDate() - 13);
  return { from, to };
}

const BMS_TABS = [
  { id: "steps", label: "Step Tracking" },
  { id: "heart", label: "Heart Rate" },
  { id: "sleep", label: "Sleep Tracking" },
  { id: "mental", label: "Mental & Emotional Wellbeing" },
  { id: "yoga", label: "Yoga" },
  { id: "exercise", label: "Physical Exercise" },
];

function SegFilter({ options, value, onChange }) {
  return (
    <div className="ua-cp-bms-filters" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={`ua-cp-bms-filters__btn${value === opt.id ? " ua-cp-bms-filters__btn--active" : ""}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MetricChartCard({
  icon,
  iconTone,
  title,
  rangeLabel,
  avgLabel,
  todayLabel,
  todayStrong,
  todaySuffix,
  days,
  maxValue,
  formatValue,
  barTone = "default",
  getBarClass,
}) {
  return (
    <div className="ua-cp-bms-chart-card">
      <div className="ua-cp-bms-chart-card__head">
        <div className="ua-cp-bms-chart-card__title-wrap">
          <span className={`ua-cp-bms-chart-card__icon ua-cp-bms-chart-card__icon--${iconTone}`} aria-hidden="true">{icon}</span>
          <div>
            <strong>{title}</strong>
            <span>{rangeLabel}</span>
          </div>
        </div>
        <div className="ua-cp-bms-chart-card__stats">
          {avgLabel}
          {" · "}
          Today <strong className={`ua-cp-bms-chart-card__today ua-cp-bms-chart-card__today--${barTone}`}>{todayStrong}</strong>
          {todaySuffix ? ` ${todaySuffix}` : null}
        </div>
      </div>
      <div className="ua-cp-bms-chart">
        {days.length ? days.map((d, index) => {
          const barClass = getBarClass ? getBarClass(d, index) : (d.day === days[days.length - 1]?.day ? "today" : "default");
          const safeMax = maxValue > 0 ? maxValue : 1;
          return (
            <div key={`${d.day}-${index}`} className="ua-cp-bms-chart__col">
              <span className="ua-cp-bms-chart__val">{formatValue(d.value)}</span>
              <div className="ua-cp-bms-chart__bar-wrap">
                <span
                  className={`ua-cp-bms-chart__bar ua-cp-bms-chart__bar--${barClass}`}
                  style={{ height: `${Math.max(12, (d.value / safeMax) * 100)}%` }}
                />
              </div>
              <span className="ua-cp-bms-chart__day">{d.day}</span>
            </div>
          );
        }) : (
          <p className="ua-cp-bms-library-hint">No data in this range.</p>
        )}
      </div>
    </div>
  );
}

function StepsPanel({ chart, historyRange, onRangeChange, loading }) {
  const max = Math.max(...(chart.days.map((d) => d.value)), chart.goal, 1);
  if (loading) return <p className="ua-cp-bms-library-hint">Loading step tracking…</p>;

  return (
    <>
      <div className="ua-cp-bms-toolbar">
        <FoodWaterHistoryPicker range={historyRange} onRangeChange={onRangeChange} />
        <div className="ua-cp-bms-goal-pill">
          <span className="ua-cp-bms-goal-pill__label">Goal</span>
          <strong>{chart.goal.toLocaleString()} steps / day</strong>
        </div>
      </div>
      <MetricChartCard
        icon="👟"
        iconTone="teal"
        title="Step tracking"
        rangeLabel={chart.rangeLabel}
        avgLabel={<>Avg <strong>{chart.avg.toLocaleString()}</strong></>}
        todayStrong={chart.today.toLocaleString()}
        todaySuffix={`/ ${chart.goal.toLocaleString()}`}
        days={chart.days}
        maxValue={max}
        formatValue={formatStepsLabel}
        barTone="teal"
        getBarClass={(d) => (d.day === chart.todayDay ? "today-teal" : "teal")}
      />
    </>
  );
}

function HeartPanel({ chart, historyRange, onRangeChange, enabled, loading }) {
  const max = Math.max(...(chart.days.map((d) => d.value)), BMS_GOALS.heartRestMax, 1);

  if (!enabled) {
    return (
      <div className="ua-cp-bms-disabled">
        <p>Heart rate tracking is turned off for this client.</p>
      </div>
    );
  }

  if (loading) return <p className="ua-cp-bms-library-hint">Loading heart rate…</p>;

  return (
    <>
      <div className="ua-cp-bms-toolbar">
        <FoodWaterHistoryPicker range={historyRange} onRangeChange={onRangeChange} />
        <div className="ua-cp-bms-zone-pill">
          <span className="ua-cp-bms-zone-pill__label">Resting zone</span>
          <strong>{BMS_GOALS.heartRestMin}–{BMS_GOALS.heartRestMax} bpm</strong>
        </div>
      </div>
      <MetricChartCard
        icon="♥"
        iconTone="heart"
        title="Heart rate"
        rangeLabel={chart.rangeLabel}
        avgLabel={<>Avg <strong>{chart.avg}</strong></>}
        todayStrong={String(chart.today)}
        todaySuffix="bpm"
        days={chart.days}
        maxValue={max}
        formatValue={(v) => String(v)}
        barTone="heart"
        getBarClass={(d, index) => {
          if (d.day === chart.todayDay) return "today-heart";
          if (index === 0 || isHeartOutOfZone(d.value)) return "warn";
          return "heart";
        }}
      />
    </>
  );
}

function SleepGoalBar({
  goal,
  editing,
  draftGoal,
  clientCanSet,
  onStartEdit,
  onCancel,
  onSave,
  onDraftChange,
}) {
  return (
    <div className="ua-cp-bms-sleep-goal">
      {editing ? (
        <>
          <span className="ua-cp-bms-sleep-goal__label">Goal</span>
          <input
            type="number"
            className="ua-cp-bms-sleep-goal__input"
            value={draftGoal}
            min={4}
            max={12}
            step={0.5}
            onChange={(e) => onDraftChange(Number(e.target.value) || 1)}
          />
          <span className="ua-cp-bms-sleep-goal__unit">h / night</span>
          <button type="button" className="ua-cp-bms-sleep-goal__cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={onSave}>Save</button>
          <span className="ua-cp-bms-sleep-goal__badge ua-cp-bms-sleep-goal__badge--locked">App editing locked</span>
        </>
      ) : (
        <>
          <span className="ua-cp-bms-sleep-goal__text">Goal <strong>{goal}</strong> h / night</span>
          <button type="button" className="ua-cp-bms-sleep-goal__set" onClick={onStartEdit}>Set target</button>
          {clientCanSet ? (
            <span className="ua-cp-bms-sleep-goal__badge ua-cp-bms-sleep-goal__badge--ok">Client can set in app</span>
          ) : null}
        </>
      )}
    </div>
  );
}

function SleepScoreRing({ score }) {
  return (
    <div className="ua-cp-bms-sleep-ring" style={{ "--score-pct": `${score}%` }}>
      <div className="ua-cp-bms-sleep-ring__inner">
        <strong>{score}</strong>
        <span>Score</span>
      </div>
    </div>
  );
}

function SleepPanel({
  chart,
  summary,
  historyRange,
  onRangeChange,
  enabled,
  sleepGoal,
  sleepGoalEditing,
  sleepGoalDraft,
  clientCanSetSleep,
  showTargetHistory,
  onStartEditGoal,
  onCancelGoal,
  onSaveGoal,
  onDraftGoalChange,
  loading,
}) {
  const max = Math.max(...(chart.days.map((d) => d.value)), sleepGoal + 1, 1);

  if (!enabled) {
    return (
      <div className="ua-cp-bms-disabled">
        <p>Sleep tracking is turned off for this client.</p>
      </div>
    );
  }

  if (loading) return <p className="ua-cp-bms-library-hint">Loading sleep tracking…</p>;

  return (
    <>
      <div className="ua-cp-bms-toolbar">
        <FoodWaterHistoryPicker range={historyRange} onRangeChange={onRangeChange} />
        <SleepGoalBar
          goal={sleepGoal}
          editing={sleepGoalEditing}
          draftGoal={sleepGoalDraft}
          clientCanSet={clientCanSetSleep}
          onStartEdit={onStartEditGoal}
          onCancel={onCancelGoal}
          onSave={onSaveGoal}
          onDraftChange={onDraftGoalChange}
        />
      </div>
      {showTargetHistory ? (
        <div className="ua-cp-bms-target-history">
          <span className="ua-cp-bms-target-history__label">Target history</span>
          <span>{BMS_SLEEP_TARGET_HISTORY.value} {BMS_SLEEP_TARGET_HISTORY.unit} · {BMS_SLEEP_TARGET_HISTORY.source} · {BMS_SLEEP_TARGET_HISTORY.date}</span>
        </div>
      ) : null}
      <div className="ua-cp-bms-sleep-summary">
        <SleepScoreRing score={summary.score} />
        <div className="ua-cp-bms-sleep-summary__copy">
          <strong>{summary.quality}</strong> sleep quality
          <span>Slept <strong>{summary.sleptHours} h</strong> · goal {sleepGoal} h</span>
        </div>
        {summary.stages?.length ? (
          <div className="ua-cp-bms-sleep-stages">
            {summary.stages.map((stage) => (
              <div key={stage.id} className="ua-cp-bms-sleep-stage">
                <div className="ua-cp-bms-sleep-stage__head">
                  <span className={`ua-cp-bms-sleep-stage__dot ua-cp-bms-sleep-stage__dot--${stage.id}`} />
                  <span>{stage.label}</span>
                  <strong>{stage.duration}</strong>
                </div>
                <div className="ua-cp-bms-sleep-stage__bar">
                  <span style={{ width: `${stage.pct}%` }} className={`ua-cp-bms-sleep-stage__fill ua-cp-bms-sleep-stage__fill--${stage.id}`} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <MetricChartCard
        icon="🌙"
        iconTone="sleep"
        title="Sleep duration"
        rangeLabel={chart.rangeLabel}
        avgLabel={<>Avg <strong>{chart.avg}</strong></>}
        todayStrong={String(chart.last)}
        todaySuffix="h"
        days={chart.days}
        maxValue={max}
        formatValue={(v) => String(v)}
        barTone="sleep"
        getBarClass={(d) => (d.day === chart.todayDay ? "today-sleep" : "sleep")}
      />
    </>
  );
}

function ContentCard({ item, onToggle, busy }) {
  return (
    <div className="ua-cp-bms-content-card">
      <div className="ua-cp-bms-content-card__thumb" aria-hidden="true">
        {item.thumbnail ? <img src={item.thumbnail} alt="" /> : null}
      </div>
      <div className="ua-cp-bms-content-card__body">
        <div className="ua-cp-bms-content-card__meta">
          <span className={`ua-cp-bms-content-card__type ua-cp-bms-content-card__type--${item.type}`}>
            {item.type === "audio" ? "Audio" : item.type === "ytlink" ? "YouTube" : "Video"}
          </span>
          {item.duration ? <span className="ua-cp-bms-content-card__duration">{item.duration}</span> : null}
        </div>
        <strong className="ua-cp-bms-content-card__title">{item.title}</strong>
        <span className="ua-cp-bms-content-card__source">{item.source || (item.ytLink ? "YouTube" : "")}</span>
      </div>
      <button
        type="button"
        className={`ua-cp-bms-content-card__action${item.inApp ? " ua-cp-bms-content-card__action--in" : ""}`}
        disabled={busy}
        onClick={() => onToggle(item)}
      >
        {item.inApp ? "✓ In user app" : "Add to app"}
      </button>
    </div>
  );
}

function ContentLibraryPanel({
  items,
  filter,
  onFilterChange,
  filterOptions,
  onToggle,
  hint,
  loading,
  emptyLabel,
  busy,
}) {
  const selectedCount = items.filter((i) => i.inApp).length;

  const filtered = useMemo(() => {
    if (filter === "in-app") return items.filter((i) => i.inApp);
    if (filter === "video") return items.filter((i) => i.type === "video" || i.type === "ytlink");
    if (filter === "audio") return items.filter((i) => i.type === "audio");
    return items;
  }, [items, filter]);

  return (
    <>
      <div className="ua-cp-bms-library-toolbar">
        <SegFilter options={filterOptions} value={filter} onChange={onFilterChange} />
        <span className="ua-cp-bms-library-toolbar__count">{selectedCount} selected for user app</span>
      </div>
      <p className="ua-cp-bms-library-hint">{hint}</p>
      {loading ? (
        <p className="ua-cp-bms-library-hint">Loading library…</p>
      ) : filtered.length ? (
        <div className="ua-cp-bms-content-list">
          {filtered.map((item) => (
            <ContentCard key={item.id} item={item} onToggle={onToggle} busy={busy} />
          ))}
        </div>
      ) : (
        <p className="ua-cp-bms-library-hint">{emptyLabel}</p>
      )}
    </>
  );
}

export function BmsSection({ user, onToast, onUserUpdated }) {
  const { canEdit, canCreate, canDelete } = useClientSectionPermissions("bms");
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = BMS_TABS.some((t) => t.id === tabParam) ? tabParam : "steps";
  const userId = String(user?.id || "").trim();
  const live = isLiveUserId(userId);
  const today = useMemo(() => localToday(), []);
  const canAssign = String(user?.userTier || "").toLowerCase() === "heal";

  const [heartRateOn, setHeartRateOn] = useState(() => user?.heartRateEnabled !== false);
  const [sleepTrackingOn, setSleepTrackingOn] = useState(() => user?.sleepTrackingEnabled !== false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [historyRange, setHistoryRange] = useState(() => defaultBmsRange(today));
  const [sleepGoal, setSleepGoal] = useState(BMS_GOALS.sleepHours);
  const [sleepGoalEditing, setSleepGoalEditing] = useState(false);
  const [sleepGoalDraft, setSleepGoalDraft] = useState(BMS_GOALS.sleepHours);
  const [showTargetHistory, setShowTargetHistory] = useState(false);
  const [clientCanSetSleep] = useState(true);
  const [stepsHistory, setStepsHistory] = useState(null);
  const [stepsGoal, setStepsGoal] = useState(BMS_GOALS.steps);
  const [heartHistory, setHeartHistory] = useState(null);
  const [sleepHistory, setSleepHistory] = useState(null);
  const [sleepToday, setSleepToday] = useState(null);
  const [metricLoading, setMetricLoading] = useState(false);

  const [mentalItems, setMentalItems] = useState([]);
  const [yogaItems, setYogaItems] = useState([]);
  const [exerciseItems, setExerciseItems] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState({ mental: false, yoga: false, exercise: false });
  const [libraryBusy, setLibraryBusy] = useState(false);

  const [mentalFilter, setMentalFilter] = useState("all");
  const [yogaFilter, setYogaFilter] = useState("all");
  const [exerciseFilter, setExerciseFilter] = useState("all");

  useEffect(() => {
    setHeartRateOn(user?.heartRateEnabled !== false);
    setSleepTrackingOn(user?.sleepTrackingEnabled !== false);
  }, [user?.heartRateEnabled, user?.sleepTrackingEnabled]);

  useEffect(() => {
    setHistoryRange(defaultBmsRange(today));
    setStepsHistory(null);
    setHeartHistory(null);
    setSleepHistory(null);
    setSleepToday(null);
  }, [live, today, userId]);

  const stepsChart = useMemo(() => (
    buildStepsChartFromHistory(live ? (stepsHistory || []) : [], historyRange.from, historyRange.to, {
      today,
      goal: stepsGoal,
    })
  ), [live, stepsHistory, stepsGoal, historyRange.from, historyRange.to, today]);
  const heartChart = useMemo(() => (
    buildHeartChartFromHistory(live ? (heartHistory || []) : [], historyRange.from, historyRange.to, today)
  ), [live, heartHistory, historyRange.from, historyRange.to, today]);
  const sleepChart = useMemo(() => (
    buildSleepChartFromHistory(live ? (sleepHistory || []) : [], historyRange.from, historyRange.to, today)
  ), [live, sleepHistory, historyRange.from, historyRange.to, today]);
  const sleepSummary = useMemo(() => (
    buildSleepSummaryFromToday(live ? sleepToday : null, sleepGoal)
  ), [live, sleepToday, sleepGoal]);

  function setTab(next) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("section", "bms");
      p.set("tab", next);
      if (searchParams.get("mode") === "detailed") p.set("mode", "detailed");
      return p;
    }, { replace: true });
  }

  useEffect(() => {
    if (!live) return undefined;
    if (tab !== "steps" && tab !== "heart" && tab !== "sleep") return undefined;
    let cancelled = false;
    setMetricLoading(true);
    const range = {
      from: formatFoodDateInput(historyRange.from),
      to: formatFoodDateInput(historyRange.to),
    };
    const request = tab === "steps"
      ? fetchUserStepsTracking(userId, range)
      : tab === "heart"
        ? fetchUserHeartRateTracking(userId, range)
        : fetchUserSleepTracking(userId, range);

    request
      .then((data) => {
        if (cancelled) return;
        const history = data?.history || [];
        if (tab === "steps") {
          setStepsHistory(history);
          const goal = Number(data?.settings?.goalSteps);
          if (Number.isFinite(goal) && goal > 0) setStepsGoal(goal);
        } else if (tab === "heart") {
          setHeartHistory(history);
        } else {
          setSleepHistory(history);
          setSleepToday(data?.today || history[history.length - 1] || null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (tab === "steps") setStepsHistory([]);
        if (tab === "heart") setHeartHistory([]);
        if (tab === "sleep") {
          setSleepHistory([]);
          setSleepToday(null);
        }
        onToast(error?.message || "Failed to load tracking data");
      })
      .finally(() => {
        if (!cancelled) setMetricLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [live, onToast, tab, userId, historyRange.from, historyRange.to]);

  useEffect(() => {
    const kindByTab = { mental: "mental", yoga: "yoga", exercise: "exercise" };
    const kind = kindByTab[tab];
    if (!kind || !userId) return undefined;

    let cancelled = false;
    const setters = { mental: setMentalItems, yoga: setYogaItems, exercise: setExerciseItems };

    async function loadLibrary() {
      setLibraryLoading((prev) => ({ ...prev, [kind]: true }));
      try {
        const [{ items }, assignments] = await Promise.all([
          adminListWellnessLibrary(kind, null, { page: 1, limit: 200, status: "active" }),
          canAssign ? listUserWellnessAssignments(kind, userId) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const assigned = new Map((assignments || []).map((row) => [row.itemId, row.assignmentId]));
        setters[kind]((items || []).map((item) => ({
          ...item,
          inApp: assigned.has(item.id),
          assignmentId: assigned.get(item.id) || "",
        })));
      } catch (error) {
        if (!cancelled) onToast(error?.message || "Failed to load library");
      } finally {
        if (!cancelled) setLibraryLoading((prev) => ({ ...prev, [kind]: false }));
      }
    }

    loadLibrary();
    return () => {
      cancelled = true;
    };
  }, [tab, userId, canAssign, onToast]);

  async function toggleTracking(kind, next) {
    if (!live) {
      if (kind === "heart") setHeartRateOn(next);
      else setSleepTrackingOn(next);
      onToast(next
        ? `${kind === "heart" ? "Heart rate" : "Sleep tracking"} enabled in the client app`
        : `${kind === "heart" ? "Heart rate" : "Sleep tracking"} hidden from the client app`);
      return;
    }
    if (toggleBusy) return;
    const prevHeart = heartRateOn;
    const prevSleep = sleepTrackingOn;
    if (kind === "heart") setHeartRateOn(next);
    else setSleepTrackingOn(next);
    setToggleBusy(true);
    try {
      await updateUserBmsTracking(userId, kind === "heart"
        ? { heartRateEnabled: next }
        : { sleepTrackingEnabled: next });
      try {
        const row = await fetchUser(userId);
        if (row) onUserUpdated?.(row);
      } catch {
        // Toggle already saved; profile refresh is best-effort.
      }
      onToast(next
        ? `${kind === "heart" ? "Heart rate" : "Sleep tracking"} enabled in the client app`
        : `${kind === "heart" ? "Heart rate" : "Sleep tracking"} hidden from the client app`);
    } catch (error) {
      setHeartRateOn(prevHeart);
      setSleepTrackingOn(prevSleep);
      onToast(error?.message || "Failed to update tracking visibility");
    } finally {
      setToggleBusy(false);
    }
  }

  async function toggleContent(kind, item) {
    if (!userId) return;
    if (item.inApp && item.assignmentId && !canDelete) return;
    if (!item.inApp && !canCreate) return;
    if (!canAssign) {
      onToast("Content can only be assigned to Heal clients");
      return;
    }
    if (libraryBusy) return;
    const setters = { mental: setMentalItems, yoga: setYogaItems, exercise: setExerciseItems };
    setLibraryBusy(true);
    try {
      if (item.inApp && item.assignmentId) {
        await unassignUserWellnessItem(kind, userId, item.assignmentId);
        setters[kind]((list) => list.map((entry) => (
          entry.id === item.id ? { ...entry, inApp: false, assignmentId: "" } : entry
        )));
        onToast("Removed from user app");
      } else {
        const created = await assignUserWellnessItems(kind, userId, [item.id]);
        const assignmentId = created?.[0]?.assignmentId || "";
        setters[kind]((list) => list.map((entry) => (
          entry.id === item.id ? { ...entry, inApp: true, assignmentId } : entry
        )));
        onToast("Added to user app");
      }
    } catch (error) {
      onToast(error?.message || "Failed to update selection");
    } finally {
      setLibraryBusy(false);
    }
  }

  function saveSleepGoal() {
    setSleepGoal(sleepGoalDraft);
    setSleepGoalEditing(false);
    setShowTargetHistory(true);
    onToast("Sleep target updated");
  }

  const mentalFilters = [
    { id: "all", label: "All" },
    { id: "video", label: "Videos" },
    { id: "audio", label: "Audio" },
    { id: "in-app", label: "In app" },
  ];

  const visibleTabs = BMS_TABS.filter((t) => {
    if (t.id === "heart" && !heartRateOn) return false;
    if (t.id === "sleep" && !sleepTrackingOn) return false;
    return true;
  });

  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0]?.id || "steps";

  return (
    <div className="ua-cp-section ua-cp-bms">
      <div className="ua-cp-bms__head">
        <div className="ua-cp-bms__head-copy">
          <h2 className="ua-cp-bms__title">Body, Mind &amp; Soul</h2>
          <p className="ua-cp-bms__sub">Holistic wellbeing tracking across body, mind and lifestyle.</p>
        </div>
        <div className="ua-cp-bms__toggles">
          <div className="ua-cp-bms__toggle">
            <span className="ua-cp-bms__toggle-label">Heart rate</span>
            <button
              type="button"
              className={`ua-toggle${heartRateOn ? " ua-toggle--on" : ""}`}
              aria-pressed={heartRateOn}
              onClick={() => canEdit && toggleTracking("heart", !heartRateOn)}
              disabled={toggleBusy || !canEdit}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
          <div className="ua-cp-bms__toggle">
            <span className="ua-cp-bms__toggle-label">Sleep tracking</span>
            <button
              type="button"
              className={`ua-toggle${sleepTrackingOn ? " ua-toggle--on" : ""}`}
              aria-pressed={sleepTrackingOn}
              onClick={() => canEdit && toggleTracking("sleep", !sleepTrackingOn)}
              disabled={toggleBusy || !canEdit}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        </div>
      </div>

      <PillTabs size="md" active={activeTab} onChange={setTab} tabs={visibleTabs} />

      {activeTab === "steps" ? (
        <StepsPanel
          chart={stepsChart}
          historyRange={historyRange}
          onRangeChange={setHistoryRange}
          loading={live && metricLoading && !stepsHistory}
        />
      ) : null}

      {activeTab === "heart" ? (
        <HeartPanel
          chart={heartChart}
          historyRange={historyRange}
          onRangeChange={setHistoryRange}
          enabled={heartRateOn}
          loading={live && metricLoading && !heartHistory}
        />
      ) : null}

      {activeTab === "sleep" ? (
        <SleepPanel
          chart={sleepChart}
          summary={sleepSummary}
          historyRange={historyRange}
          onRangeChange={setHistoryRange}
          enabled={sleepTrackingOn}
          sleepGoal={sleepGoal}
          sleepGoalEditing={sleepGoalEditing}
          sleepGoalDraft={sleepGoalDraft}
          clientCanSetSleep={clientCanSetSleep}
          showTargetHistory={showTargetHistory}
          onStartEditGoal={() => {
            setSleepGoalDraft(sleepGoal);
            setSleepGoalEditing(true);
          }}
          onCancelGoal={() => setSleepGoalEditing(false)}
          onSaveGoal={saveSleepGoal}
          onDraftGoalChange={setSleepGoalDraft}
          loading={live && metricLoading && !sleepHistory}
        />
      ) : null}

      {activeTab === "mental" ? (
        <ContentLibraryPanel
          items={mentalItems}
          filter={mentalFilter}
          onFilterChange={setMentalFilter}
          filterOptions={mentalFilters}
          onToggle={(item) => toggleContent("mental", item)}
          loading={libraryLoading.mental}
          busy={libraryBusy}
          emptyLabel="No mental wellbeing items yet. Add them in Config → Common."
          hint="Admin maintains the full library of videos & audios. The wellness coach selects which appear in this client's app."
        />
      ) : null}

      {activeTab === "yoga" ? (
        <ContentLibraryPanel
          items={yogaItems}
          filter={yogaFilter}
          onFilterChange={setYogaFilter}
          filterOptions={mentalFilters}
          onToggle={(item) => toggleContent("yoga", item)}
          loading={libraryLoading.yoga}
          busy={libraryBusy}
          emptyLabel="No yoga items yet. Add them in Config → Common."
          hint="Admin maintains the full library of yoga videos & audios. The wellness coach selects which appear in this client's app."
        />
      ) : null}

      {activeTab === "exercise" ? (
        <ContentLibraryPanel
          items={exerciseItems}
          filter={exerciseFilter}
          onFilterChange={setExerciseFilter}
          filterOptions={mentalFilters}
          onToggle={(item) => toggleContent("exercise", item)}
          loading={libraryLoading.exercise}
          busy={libraryBusy}
          emptyLabel="No physical exercise items yet. Add them in Config → Common."
          hint="Admin maintains the full library of videos & audios. The wellness coach selects which appear in this client's app."
        />
      ) : null}
    </div>
  );
}
