import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PillTabs } from "../shared.jsx";
import { FoodWaterHistoryPicker } from "./FoodDatePicker.jsx";
import {
  BMS_GOALS,
  BMS_SLEEP_SUMMARY,
  BMS_SLEEP_TARGET_HISTORY,
  DEFAULT_BMS_RANGE,
  EXERCISE_CONTENT,
  MENTAL_CONTENT,
  YOGA_CONTENT,
  buildHeartChart,
  buildSleepChart,
  buildStepsChart,
  formatStepsLabel,
  isHeartOutOfZone,
} from "../../data/bmsData.js";

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
        {days.map((d, index) => {
          const barClass = getBarClass ? getBarClass(d, index) : (d.day === days[days.length - 1]?.day ? "today" : "default");
          return (
            <div key={d.day} className="ua-cp-bms-chart__col">
              <span className="ua-cp-bms-chart__val">{formatValue(d.value)}</span>
              <div className="ua-cp-bms-chart__bar-wrap">
                <span
                  className={`ua-cp-bms-chart__bar ua-cp-bms-chart__bar--${barClass}`}
                  style={{ height: `${Math.max(12, (d.value / maxValue) * 100)}%` }}
                />
              </div>
              <span className="ua-cp-bms-chart__day">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepsPanel({ chart, historyRange, onRangeChange }) {
  const max = Math.max(...chart.days.map((d) => d.value), chart.goal);

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

function HeartPanel({ chart, historyRange, onRangeChange, enabled }) {
  const max = Math.max(...chart.days.map((d) => d.value), BMS_GOALS.heartRestMax);

  if (!enabled) {
    return (
      <div className="ua-cp-bms-disabled">
        <p>Heart rate tracking is turned off for this client.</p>
      </div>
    );
  }

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
}) {
  const max = Math.max(...chart.days.map((d) => d.value), sleepGoal + 1);

  if (!enabled) {
    return (
      <div className="ua-cp-bms-disabled">
        <p>Sleep tracking is turned off for this client.</p>
      </div>
    );
  }

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

function ContentCard({ item, onToggle }) {
  return (
    <div className="ua-cp-bms-content-card">
      <div className="ua-cp-bms-content-card__thumb" aria-hidden="true" />
      <div className="ua-cp-bms-content-card__body">
        <div className="ua-cp-bms-content-card__meta">
          <span className={`ua-cp-bms-content-card__type ua-cp-bms-content-card__type--${item.type}`}>
            {item.type === "video" ? "Video" : "Audio"}
          </span>
          <span className="ua-cp-bms-content-card__duration">{item.duration}</span>
        </div>
        <strong className="ua-cp-bms-content-card__title">{item.title}</strong>
        <span className="ua-cp-bms-content-card__source">{item.source}</span>
      </div>
      <button
        type="button"
        className={`ua-cp-bms-content-card__action${item.inApp ? " ua-cp-bms-content-card__action--in" : ""}`}
        onClick={() => onToggle(item.id)}
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
}) {
  const selectedCount = items.filter((i) => i.inApp).length;

  const filtered = useMemo(() => {
    if (filter === "in-app") return items.filter((i) => i.inApp);
    if (filter === "video") return items.filter((i) => i.type === "video");
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
      <div className="ua-cp-bms-content-list">
        {filtered.map((item) => (
          <ContentCard key={item.id} item={item} onToggle={onToggle} />
        ))}
      </div>
    </>
  );
}

export function BmsSection({ onToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = BMS_TABS.some((t) => t.id === tabParam) ? tabParam : "steps";

  const [heartRateOn, setHeartRateOn] = useState(true);
  const [sleepTrackingOn, setSleepTrackingOn] = useState(true);
  const [historyRange, setHistoryRange] = useState(DEFAULT_BMS_RANGE);
  const [sleepGoal, setSleepGoal] = useState(BMS_GOALS.sleepHours);
  const [sleepGoalEditing, setSleepGoalEditing] = useState(false);
  const [sleepGoalDraft, setSleepGoalDraft] = useState(BMS_GOALS.sleepHours);
  const [showTargetHistory, setShowTargetHistory] = useState(false);
  const [clientCanSetSleep] = useState(true);

  const [mentalItems, setMentalItems] = useState(MENTAL_CONTENT);
  const [yogaItems, setYogaItems] = useState(YOGA_CONTENT);
  const [exerciseItems, setExerciseItems] = useState(EXERCISE_CONTENT);

  const [mentalFilter, setMentalFilter] = useState("all");
  const [yogaFilter, setYogaFilter] = useState("all");
  const [exerciseFilter, setExerciseFilter] = useState("all");

  const stepsChart = useMemo(
    () => buildStepsChart(historyRange.from, historyRange.to),
    [historyRange.from, historyRange.to],
  );
  const heartChart = useMemo(
    () => buildHeartChart(historyRange.from, historyRange.to),
    [historyRange.from, historyRange.to],
  );
  const sleepChart = useMemo(
    () => buildSleepChart(historyRange.from, historyRange.to),
    [historyRange.from, historyRange.to],
  );

  function setTab(next) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("section", "bms");
      p.set("tab", next);
      if (searchParams.get("mode") === "detailed") p.set("mode", "detailed");
      return p;
    }, { replace: true });
  }

  function toggleContent(setter, id) {
    setter((list) => list.map((item) => (
      item.id === id ? { ...item, inApp: !item.inApp } : item
    )));
    onToast("Content selection updated");
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

  const simpleFilters = [
    { id: "all", label: "All" },
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
              onClick={() => setHeartRateOn((v) => !v)}
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
              onClick={() => setSleepTrackingOn((v) => !v)}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        </div>
      </div>

      <PillTabs size="md" active={activeTab} onChange={setTab} tabs={visibleTabs} />

      {activeTab === "steps" ? (
        <StepsPanel chart={stepsChart} historyRange={historyRange} onRangeChange={setHistoryRange} />
      ) : null}

      {activeTab === "heart" ? (
        <HeartPanel
          chart={heartChart}
          historyRange={historyRange}
          onRangeChange={setHistoryRange}
          enabled={heartRateOn}
        />
      ) : null}

      {activeTab === "sleep" ? (
        <SleepPanel
          chart={sleepChart}
          summary={BMS_SLEEP_SUMMARY}
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
        />
      ) : null}

      {activeTab === "mental" ? (
        <ContentLibraryPanel
          items={mentalItems}
          filter={mentalFilter}
          onFilterChange={setMentalFilter}
          filterOptions={mentalFilters}
          onToggle={(id) => toggleContent(setMentalItems, id)}
          hint="Admin maintains the full library of videos & audios. The wellness coach selects which appear in this client's app."
        />
      ) : null}

      {activeTab === "yoga" ? (
        <ContentLibraryPanel
          items={yogaItems}
          filter={yogaFilter}
          onFilterChange={setYogaFilter}
          filterOptions={simpleFilters}
          onToggle={(id) => toggleContent(setYogaItems, id)}
          hint="Admin maintains the full library of yoga videos & audios. The wellness coach selects which appear in this client's app."
        />
      ) : null}

      {activeTab === "exercise" ? (
        <ContentLibraryPanel
          items={exerciseItems}
          filter={exerciseFilter}
          onFilterChange={setExerciseFilter}
          filterOptions={simpleFilters}
          onToggle={(id) => toggleContent(setExerciseItems, id)}
          hint="Admin maintains the full library of videos & audios. The wellness coach selects which appear in this client's app."
        />
      ) : null}
    </div>
  );
}
