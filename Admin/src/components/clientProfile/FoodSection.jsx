import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PillTabs } from "../shared.jsx";
import {
  FOOD_DEMO_TODAY,
  FOOD_MACRO_TARGETS,
  FOOD_MEALS,
  DEFAULT_WATER_RANGE,
  buildWaterChart,
  formatFoodDateLabel,
  macroPct,
  sumMealMacros,
} from "../../data/foodData.js";
import { MealPhotoModal } from "./MealPhotoModal.jsx";
import { FoodDateRow, FoodWaterHistoryPicker } from "./FoodDatePicker.jsx";
import { DietPlanPanel } from "./DietPlanPanel.jsx";

function SegToggle({ options, value, onChange }) {
  return (
    <div className="ua-cp-seg ua-cp-seg--xs" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={`ua-cp-seg__btn${value === opt.id ? " ua-cp-seg__btn--active" : ""}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MacroStat({ label, tone, consumed, target, unit = "g" }) {
  const pct = macroPct(consumed, target);
  return (
    <div className="ua-cp-food-macro-stat">
      <div className="ua-cp-food-macro-stat__head">
        <span className={`ua-cp-food-macro-stat__dot ua-cp-food-macro-stat__dot--${tone}`} />
        <span className="ua-cp-food-macro-stat__label">{label}</span>
      </div>
      <div className="ua-cp-food-macro-stat__val">
        <strong>{consumed}</strong>
        <span>/ {target}{unit === "kcal" ? " kcal" : ` ${unit}`}</span>
      </div>
      <div className="ua-cp-food-macro-stat__bar">
        <span className={`ua-cp-food-macro-stat__fill ua-cp-food-macro-stat__fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="ua-cp-food-macro-stat__pct">{pct}% of target</span>
    </div>
  );
}

function TargetedMacrosCard({ consumed }) {
  return (
    <div className="ua-cp-food-macros-card">
      <div className="ua-cp-food-macros-card__head">
        <span className="ua-cp-food-macros-card__title">Targeted macros · consumed vs target</span>
        <div className="ua-cp-food-macros-card__badges">
          <span className="ua-cp-food-meta-badge">BMR {FOOD_MACRO_TARGETS.bmr.toLocaleString()} kcal</span>
          <span className="ua-cp-food-meta-badge">TDEE {FOOD_MACRO_TARGETS.tdee.toLocaleString()} kcal</span>
        </div>
      </div>
      <div className="ua-cp-food-macros-card__grid">
        <MacroStat label="Protein" tone="green" consumed={consumed.protein} target={FOOD_MACRO_TARGETS.protein} />
        <MacroStat label="Carbs" tone="orange" consumed={consumed.carbs} target={FOOD_MACRO_TARGETS.carbs} />
        <MacroStat label="Fat" tone="blue" consumed={consumed.fat} target={FOOD_MACRO_TARGETS.fat} />
        <MacroStat label="Calories" tone="purple" consumed={consumed.calories} target={FOOD_MACRO_TARGETS.calories} unit="kcal" />
      </div>
    </div>
  );
}

function MacroMini({ tone, label, value, unit, editing, onChange }) {
  return (
    <div className={`ua-cp-food-meal-macro ua-cp-food-meal-macro--${tone}`}>
      <span className="ua-cp-food-meal-macro__label">
        <span className={`ua-cp-food-meal-macro__dot ua-cp-food-meal-macro__dot--${tone}`} />
        {label}
      </span>
      {editing ? (
        <input
          type="number"
          className="ua-cp-food-meal-macro__input"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      ) : (
        <strong>{value}{label === "KCAL" ? " kcal" : " g"}</strong>
      )}
    </div>
  );
}

function MealCard({
  meal,
  mode,
  onSubmitAi,
  onApprove,
  onSaveEdit,
  onOpenPhoto,
  onToast,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meal.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 });
  const shown = editing ? draft : (meal.macros || draft);

  useEffect(() => {
    if (meal.macros) setDraft(meal.macros);
  }, [meal.macros]);

  function startEdit() {
    setDraft(meal.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 });
    setEditing(true);
  }

  function saveEdit() {
    onSaveEdit(meal.id, draft);
    setEditing(false);
    onToast("Meal macros saved");
  }

  return (
    <div className={`ua-cp-food-meal${meal.aiStatus === "review" ? " ua-cp-food-meal--review" : ""}${editing ? " ua-cp-food-meal--edit" : ""}`}>
      <div className="ua-cp-food-meal__main">
        <button type="button" className="ua-cp-food-meal__photo" onClick={() => onOpenPhoto(meal)} aria-label={`View ${meal.name} photo`}>
          <span className="ua-cp-food-meal__photo-icon" aria-hidden="true">📷</span>
          <span className="ua-cp-food-meal__photo-swap" aria-hidden="true">⇄</span>
        </button>
        <div className="ua-cp-food-meal__info">
          <strong>{meal.name}</strong>
          <span>{meal.time}{mode === "detailed" ? " · entered by client" : ""}</span>
          {mode === "detailed" && meal.detailedTags?.length ? (
            <div className="ua-cp-food-meal__tags">
              {meal.detailedTags.map((tag) => (
                <span key={tag} className="ua-cp-food-meal__tag">{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="ua-cp-food-meal__actions">
          {editing ? (
            <>
              <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => setEditing(false)}>Cancel</button>
              <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" onClick={saveEdit}>Save</button>
            </>
          ) : meal.aiStatus === "review" ? (
            <>
              <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={startEdit}>Edit</button>
              <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" onClick={() => onApprove(meal.id)}>Approve</button>
            </>
          ) : (
            <button type="button" className="ua-cp-btn ua-cp-btn--ai" onClick={() => onSubmitAi(meal.id)}>
              <span aria-hidden="true">✦</span> Submit to AI
            </button>
          )}
        </div>
      </div>
      {(meal.aiStatus === "review" || editing) && meal.macros ? (
        <div className="ua-cp-food-meal__macros">
          <MacroMini tone="green" label="P" value={shown.protein} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, protein: v }))} />
          <MacroMini tone="orange" label="C" value={shown.carbs} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, carbs: v }))} />
          <MacroMini tone="blue" label="F" value={shown.fat} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, fat: v }))} />
          <MacroMini tone="purple" label="KCAL" value={shown.calories} unit="" editing={editing} onChange={(v) => setDraft((d) => ({ ...d, calories: v }))} />
        </div>
      ) : null}
    </div>
  );
}

function MealsPanel({ meals, mode, dayTotal, listLabel, dateLabel, onSubmitAi, onApprove, onSaveEdit, onOpenPhoto, onToast }) {
  return (
    <div className="ua-cp-food-meals">
      <div className="ua-cp-food-meals__head">
        <span>{dateLabel} · {listLabel}</span>
        <span>Day total: <strong>{dayTotal} kcal</strong></span>
      </div>
      {meals.map((meal) => (
        <MealCard
          key={meal.id}
          meal={meal}
          mode={mode}
          onSubmitAi={onSubmitAi}
          onApprove={onApprove}
          onSaveEdit={onSaveEdit}
          onOpenPhoto={onOpenPhoto}
          onToast={onToast}
        />
      ))}
    </div>
  );
}

function WaterChartCard({ chart, goal, todayDay }) {
  const max = Math.max(goal, ...chart.days.map((d) => d.value));
  return (
    <div className="ua-cp-food-water-card">
      <div className="ua-cp-food-water-card__head">
        <div className="ua-cp-food-water-card__title-wrap">
          <span className="ua-cp-food-water-card__icon" aria-hidden="true">📅</span>
          <div>
            <strong>Water intake</strong>
            <span>{chart.rangeLabel}</span>
          </div>
        </div>
        <div className="ua-cp-food-water-card__stats">
          Avg <strong>{chart.avg}</strong> · Today <strong className="ua-cp-food-water-card__today">{chart.today}</strong> / {goal}
        </div>
      </div>
      <div className="ua-cp-food-water-chart-scroll">
        <div className="ua-cp-food-water-chart" style={{ gridTemplateColumns: `repeat(${chart.days.length}, minmax(28px, 1fr))` }}>
          {chart.days.map((d) => (
            <div key={d.day} className="ua-cp-food-water-chart__col">
              <span className="ua-cp-food-water-chart__val">{d.value}</span>
              <div className="ua-cp-food-water-chart__bar-wrap">
                <span
                  className={`ua-cp-food-water-chart__bar${todayDay && d.day === todayDay ? " ua-cp-food-water-chart__bar--today" : ""}`}
                  style={{ height: `${Math.max(12, (d.value / max) * 100)}%` }}
                />
              </div>
              <span className="ua-cp-food-water-chart__day">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WaterGoalBar({ goal, dietPlanOn, editing, draftGoal, onStartEdit, onCancel, onSave, onDraftChange }) {
  return (
    <div className="ua-cp-food-water-goal">
      {editing ? (
        <>
          <span className="ua-cp-food-water-goal__label">Goal</span>
          <input
            type="number"
            className="ua-cp-food-water-goal__input"
            value={draftGoal}
            min={1}
            max={20}
            onChange={(e) => onDraftChange(Number(e.target.value) || 1)}
          />
          <span className="ua-cp-food-water-goal__unit">glasses / day</span>
          <button type="button" className="ua-cp-food-water-goal__cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={onSave}>Save</button>
        </>
      ) : (
        <>
          <span className="ua-cp-food-water-goal__text">Goal <strong>{goal}</strong> glasses / day</span>
          <button type="button" className="ua-cp-food-water-goal__set" onClick={onStartEdit}>Set target</button>
          {dietPlanOn ? (
            <span className="ua-cp-food-water-goal__badge ua-cp-food-water-goal__badge--ok">Client can set in app</span>
          ) : null}
        </>
      )}
      {dietPlanOn && editing ? (
        <span className="ua-cp-food-water-goal__badge ua-cp-food-water-goal__badge--locked">App editing locked</span>
      ) : null}
    </div>
  );
}

export function FoodSection({ onToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "detailed" ? "detailed" : "macro";
  const tabParam = searchParams.get("tab");
  const [dietPlanOn, setDietPlanOn] = useState(true);
  const [meals, setMeals] = useState(FOOD_MEALS);
  const [photoMeal, setPhotoMeal] = useState(null);
  const [waterGoal, setWaterGoal] = useState(8);
  const [waterGoalEditing, setWaterGoalEditing] = useState(false);
  const [waterGoalDraft, setWaterGoalDraft] = useState(8);
  const [selectedDate, setSelectedDate] = useState(FOOD_DEMO_TODAY);
  const [waterRange, setWaterRange] = useState(DEFAULT_WATER_RANGE);

  const dateLabel = formatFoodDateLabel(selectedDate);
  const waterChart = useMemo(
    () => buildWaterChart(waterRange.from, waterRange.to),
    [waterRange.from, waterRange.to],
  );

  const tab = useMemo(() => {
    if (tabParam === "water" || tabParam === "diet") return tabParam;
    if (mode === "detailed") return tabParam === "water" || tabParam === "diet" ? tabParam : "detailed-macro";
    return tabParam === "water" || tabParam === "diet" ? tabParam : "macro";
  }, [mode, tabParam]);

  const consumed = useMemo(() => sumMealMacros(meals), [meals]);
  const dayTotal = consumed.calories;

  function setMode(next) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("section", "food");
      if (next === "detailed") {
        p.set("mode", "detailed");
        p.set("tab", "detailed-macro");
      } else {
        p.delete("mode");
        p.set("tab", "macro");
      }
      return p;
    }, { replace: true });
  }

  function setTab(next) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("section", "food");
      p.set("tab", next);
      if (mode === "detailed") p.set("mode", "detailed");
      return p;
    }, { replace: true });
  }

  function submitAi(id) {
    setMeals((list) => list.map((m) => (
      m.id === id
        ? {
          ...m,
          aiStatus: "review",
          macros: m.macros || { protein: 12, carbs: 45, fat: 8, calories: 320 },
        }
        : m
    )));
    onToast("Submitted to AI for macro analysis");
  }

  function approveMeal(id) {
    setMeals((list) => list.map((m) => (m.id === id ? { ...m, aiStatus: "approved" } : m)));
    onToast("Meal approved");
  }

  function saveMealEdit(id, macros) {
    setMeals((list) => list.map((m) => (m.id === id ? { ...m, macros, aiStatus: "review" } : m)));
  }

  function saveWaterGoal() {
    setWaterGoal(waterGoalDraft);
    setWaterGoalEditing(false);
    onToast("Water goal updated");
  }

  const macroTabs = [
    { id: "macro", label: "Macro insights" },
    { id: "water", label: "Water intake" },
    { id: "diet", label: "Diet plan" },
  ];

  const detailedTabs = [
    { id: "water", label: "Water intake" },
    { id: "detailed-macro", label: "Detailed macro insights" },
    { id: "diet", label: "Diet plan" },
  ];

  return (
    <div className="ua-cp-section ua-cp-food">
      <div className="ua-cp-food__head">
        <h2 className="ua-cp-food__title">Food &amp; water tracking</h2>
        <div className="ua-cp-food__controls">
          <div className="ua-cp-food__control">
            <span className="ua-cp-food__control-label">Mode</span>
            <SegToggle
              options={[
                { id: "macro", label: "Macro" },
                { id: "detailed", label: "Detailed" },
              ]}
              value={mode}
              onChange={setMode}
            />
          </div>
          <div className="ua-cp-food__control ua-cp-food__control--diet">
            <span className="ua-cp-food__control-label">Diet plan</span>
            <button
              type="button"
              className={`ua-toggle${dietPlanOn ? " ua-toggle--on" : ""}`}
              aria-pressed={dietPlanOn}
              onClick={() => setDietPlanOn((v) => !v)}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        </div>
      </div>

      <PillTabs
        size="md"
        active={tab}
        onChange={setTab}
        tabs={mode === "detailed" ? detailedTabs : macroTabs}
      />

      {tab === "macro" ? (
        <>
          <FoodDateRow
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onToday={() => setSelectedDate(FOOD_DEMO_TODAY)}
          />
          <TargetedMacrosCard consumed={consumed} />
          <MealsPanel
            meals={meals}
            mode="macro"
            dayTotal={dayTotal}
            listLabel="meals"
            dateLabel={dateLabel}
            onSubmitAi={submitAi}
            onApprove={approveMeal}
            onSaveEdit={saveMealEdit}
            onOpenPhoto={setPhotoMeal}
            onToast={onToast}
          />
        </>
      ) : null}

      {tab === "detailed-macro" ? (
        <>
          <FoodDateRow
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onToday={() => setSelectedDate(FOOD_DEMO_TODAY)}
          />
          <TargetedMacrosCard consumed={consumed} />
          <MealsPanel
            meals={meals}
            mode="detailed"
            dayTotal={dayTotal}
            listLabel="logged food"
            dateLabel={dateLabel}
            onSubmitAi={submitAi}
            onApprove={approveMeal}
            onSaveEdit={saveMealEdit}
            onOpenPhoto={setPhotoMeal}
            onToast={onToast}
          />
        </>
      ) : null}

      {tab === "water" ? (
        <>
          <div className="ua-cp-food-water-toolbar">
            <FoodWaterHistoryPicker
              range={waterRange}
              onApply={(next) => {
                setWaterRange(next);
                onToast(`Water history updated · ${buildWaterChart(next.from, next.to).rangeLabel}`);
              }}
            />
            <WaterGoalBar
              goal={waterGoal}
              dietPlanOn={dietPlanOn}
              editing={waterGoalEditing}
              draftGoal={waterGoalDraft}
              onStartEdit={() => { setWaterGoalDraft(waterGoal); setWaterGoalEditing(true); }}
              onCancel={() => setWaterGoalEditing(false)}
              onSave={saveWaterGoal}
              onDraftChange={setWaterGoalDraft}
            />
          </div>
          <WaterChartCard chart={waterChart} goal={waterGoal} todayDay={waterChart.todayDay} />
        </>
      ) : null}

      {tab === "diet" ? <DietPlanPanel onToast={onToast} /> : null}

      {photoMeal ? <MealPhotoModal meal={photoMeal} dateLabel={dateLabel} onClose={() => setPhotoMeal(null)} /> : null}
    </div>
  );
}
