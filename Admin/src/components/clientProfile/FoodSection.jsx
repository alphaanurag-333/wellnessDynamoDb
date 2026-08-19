import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PillTabs } from "../shared.jsx";
import {
  FOOD_DEMO_TODAY,
  FOOD_MACRO_TARGETS,
  FOOD_MEALS,
  DEFAULT_WATER_RANGE,
  buildWaterChart,
  buildWaterChartFromHistory,
  formatFoodDateInput,
  formatFoodDateLabel,
  parseFoodDateInput,
  localToday,
  latestBmrTdee,
  mapMealLogToUi,
  macroPct,
  macroTargetsFromTdee,
  roundMacros,
  sumMealMacros,
} from "../../data/foodData.js";
import { fetchUserBodyAnalytics, fetchUser } from "../../api/usersApi.js";
import {
  fetchUserMealTracking,
  fetchUserWaterTracking,
  reviewUserMealLog,
  updateUserMealLog,
  updateUserMealTrackingMode,
} from "../../api/mealTrackingApi.js";
import { updateUserDietPlanEnabled } from "../../api/dietPlanCatalogApi.js";
import { MealPhotoModal } from "./MealPhotoModal.jsx";
import { FoodDateRow, FoodWaterHistoryPicker } from "./FoodDatePicker.jsx";
import { DietPlanPanel } from "./DietPlanPanel.jsx";

function isLiveUserId(userId) {
  if (!userId) return false;
  const numeric = Number(userId);
  return !(Number.isFinite(numeric) && numeric > 0 && String(numeric) === String(userId));
}

function defaultWaterRange(today = localToday()) {
  const to = new Date(today);
  const from = new Date(today);
  from.setDate(from.getDate() - 13);
  return { from, to };
}

function SegToggle({ options, value, onChange, disabled }) {
  return (
    <div className="ua-cp-seg ua-cp-seg--xs" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={`ua-cp-seg__btn${value === opt.id ? " ua-cp-seg__btn--active" : ""}`}
          disabled={disabled}
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

function TargetedMacrosCard({ consumed, targets }) {
  return (
    <div className="ua-cp-food-macros-card">
      <div className="ua-cp-food-macros-card__head">
        <span className="ua-cp-food-macros-card__title">Targeted macros · consumed vs target</span>
        <div className="ua-cp-food-macros-card__badges">
          <span className="ua-cp-food-meta-badge">BMR {(targets.bmr || 0).toLocaleString()} kcal</span>
          <span className="ua-cp-food-meta-badge">TDEE {(targets.tdee || 0).toLocaleString()} kcal</span>
        </div>
      </div>
      <div className="ua-cp-food-macros-card__grid">
        <MacroStat label="Protein" tone="green" consumed={consumed.protein} target={targets.protein} />
        <MacroStat label="Carbs" tone="orange" consumed={consumed.carbs} target={targets.carbs} />
        <MacroStat label="Fat" tone="blue" consumed={consumed.fat} target={targets.fat} />
        <MacroStat label="Calories" tone="purple" consumed={consumed.calories} target={targets.calories} unit="kcal" />
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
  live,
  busy,
  onSubmitAi,
  onApprove,
  onSaveEdit,
  onOpenPhoto,
  onToast,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meal.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 });
  const shown = editing ? draft : (meal.macros || draft);
  const showMacros = Boolean(meal.macros) && (meal.aiStatus === "review" || meal.aiStatus === "approved" || meal.aiStatus === "rejected" || editing);

  useEffect(() => {
    if (meal.macros) setDraft(meal.macros);
  }, [meal.macros]);

  function startEdit() {
    setDraft(meal.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 });
    setEditing(true);
  }

  async function saveEdit() {
    try {
      await onSaveEdit(meal.id, draft);
      setEditing(false);
      onToast("Meal macros saved");
    } catch {
      // Error toast is handled by the parent save handler.
    }
  }

  const subtitle = [meal.time, mode === "detailed" ? (meal.loggedBy || "entered by client") : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`ua-cp-food-meal${meal.aiStatus === "review" ? " ua-cp-food-meal--review" : ""}${editing ? " ua-cp-food-meal--edit" : ""}`}>
      <div className="ua-cp-food-meal__main">
        <button type="button" className="ua-cp-food-meal__photo" onClick={() => onOpenPhoto(meal)} aria-label={`View ${meal.name} photo`}>
          {meal.photoUrl ? (
            <img src={meal.photoUrl} alt="" className="ua-cp-food-meal__photo-img" />
          ) : (
            <span className="ua-cp-food-meal__photo-icon" aria-hidden="true">📷</span>
          )}
          <span className="ua-cp-food-meal__photo-swap" aria-hidden="true">⇄</span>
        </button>
        <div className="ua-cp-food-meal__info">
          <strong>{meal.name}</strong>
          <span>{subtitle}</span>
          {meal.description ? (
            <p className="ua-cp-food-meal__desc">{meal.description}</p>
          ) : null}
          {mode === "detailed" && meal.detailedTags?.length ? (
            <div className="ua-cp-food-meal__tags">
              {meal.detailedTags.map((tag, index) => (
                <span key={`${tag}-${index}`} className="ua-cp-food-meal__tag">{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="ua-cp-food-meal__actions">
          {editing ? (
            <>
              <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
              <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" disabled={busy} onClick={saveEdit}>Save</button>
            </>
          ) : meal.aiStatus === "review" ? (
            <>
              <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" disabled={busy} onClick={startEdit}>Edit</button>
              <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" disabled={busy} onClick={() => onApprove(meal.id)}>Approve</button>
            </>
          ) : meal.aiStatus === "approved" ? (
            <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" disabled={busy} onClick={startEdit}>Edit</button>
          ) : meal.aiStatus === "rejected" ? (
            <span className="ua-cp-food-meal__status">Rejected</span>
          ) : live ? (
            <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" disabled={busy} onClick={startEdit}>Edit</button>
          ) : (
            <button type="button" className="ua-cp-btn ua-cp-btn--ai" onClick={() => onSubmitAi(meal.id)}>
              <span aria-hidden="true">✦</span> Submit to AI
            </button>
          )}
        </div>
      </div>
      {showMacros ? (
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

function MealsPanel({ meals, mode, live, busyId, dayTotal, listLabel, dateLabel, loading, onSubmitAi, onApprove, onSaveEdit, onOpenPhoto, onToast }) {
  return (
    <div className="ua-cp-food-meals">
      <div className="ua-cp-food-meals__head">
        <span>{dateLabel} · {listLabel}</span>
        <span>Day total: <strong>{dayTotal} kcal</strong></span>
      </div>
      {loading ? (
        <p className="ua-page-head__sub">Loading meals…</p>
      ) : meals.length ? (
        meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            mode={mode}
            live={live}
            busy={busyId === meal.id}
            onSubmitAi={onSubmitAi}
            onApprove={onApprove}
            onSaveEdit={onSaveEdit}
            onOpenPhoto={onOpenPhoto}
            onToast={onToast}
          />
        ))
      ) : (
        <p className="ua-page-head__sub">No meals logged for this date.</p>
      )}
    </div>
  );
}

function WaterChartCard({ chart, goal, todayDay }) {
  const max = Math.max(goal || 0, ...chart.days.map((d) => d.value), 1);
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
        <div className="ua-cp-food-water-chart" style={{ gridTemplateColumns: `repeat(${Math.max(chart.days.length, 1)}, minmax(28px, 1fr))` }}>
          {chart.days.map((d, index) => (
            <div key={`${d.day}-${index}`} className="ua-cp-food-water-chart__col">
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

function WaterGoalBar({ goal, dietPlanOn, editing, draftGoal, onStartEdit, onCancel, onSave, onDraftChange, canEdit }) {
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
          {canEdit ? (
            <button type="button" className="ua-cp-food-water-goal__set" onClick={onStartEdit}>Set target</button>
          ) : null}
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

export function FoodSection({ user, onToast, onUserUpdated }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = String(user?.id || "").trim();
  const live = isLiveUserId(userId);
  const today = useMemo(() => (live ? localToday() : FOOD_DEMO_TODAY), [live]);
  const mode = searchParams.get("mode") === "detailed" ? "detailed" : "macro";
  const tabParam = searchParams.get("tab");
  const [dietPlanOn, setDietPlanOn] = useState(() => user?.dietPlanEnabled !== false);
  const [dietPlanBusy, setDietPlanBusy] = useState(false);
  const [meals, setMeals] = useState(live ? [] : FOOD_MEALS);
  const [photoMeal, setPhotoMeal] = useState(null);
  const [waterGoal, setWaterGoal] = useState(8);
  const [waterGoalEditing, setWaterGoalEditing] = useState(false);
  const [waterGoalDraft, setWaterGoalDraft] = useState(8);
  const [selectedDate, setSelectedDate] = useState(today);
  const [waterRange, setWaterRange] = useState(() => (live ? defaultWaterRange(today) : DEFAULT_WATER_RANGE));
  const [macroTargets, setMacroTargets] = useState(FOOD_MACRO_TARGETS);
  const [waterHistory, setWaterHistory] = useState(null);
  const [mealsLoading, setMealsLoading] = useState(live);
  const [waterLoading, setWaterLoading] = useState(false);
  const [modeBusy, setModeBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const jumpedToLatestRef = useRef(false);

  const dateLabel = formatFoodDateLabel(selectedDate, today);
  const waterChart = useMemo(() => {
    if (live && waterHistory) {
      return buildWaterChartFromHistory(waterHistory, waterRange.from, waterRange.to, today);
    }
    return buildWaterChart(waterRange.from, waterRange.to, today);
  }, [live, today, waterHistory, waterRange.from, waterRange.to]);

  const tab = useMemo(() => {
    if (tabParam === "water" || tabParam === "diet") return tabParam;
    if (mode === "detailed") return tabParam === "water" || tabParam === "diet" ? tabParam : "detailed-macro";
    return tabParam === "water" || tabParam === "diet" ? tabParam : "macro";
  }, [mode, tabParam]);

  const consumed = useMemo(() => roundMacros(sumMealMacros(meals)), [meals]);
  const dayTotal = consumed.calories;

  useEffect(() => {
    setSelectedDate(today);
    setWaterRange(live ? defaultWaterRange(today) : DEFAULT_WATER_RANGE);
    setPhotoMeal(null);
    setWaterHistory(null);
    setMacroTargets(FOOD_MACRO_TARGETS);
    setMeals(live ? [] : FOOD_MEALS);
    jumpedToLatestRef.current = false;
  }, [live, today, userId]);

  useEffect(() => {
    setDietPlanOn(user?.dietPlanEnabled !== false);
  }, [user?.dietPlanEnabled]);

  useEffect(() => {
    if (!live) return undefined;
    let cancelled = false;
    fetchUserBodyAnalytics(userId)
      .then((data) => {
        if (cancelled) return;
        const { bmr, tdee } = latestBmrTdee(data?.metabolicMetrics);
        setMacroTargets(macroTargetsFromTdee(tdee, bmr));
      })
      .catch(() => {
        if (!cancelled) setMacroTargets(macroTargetsFromTdee(0, 0));
      });
    return () => {
      cancelled = true;
    };
  }, [live, userId]);

  useEffect(() => {
    if (!live) {
      setMeals(FOOD_MEALS);
      setMealsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setMealsLoading(true);
    fetchUserMealTracking(userId, { date: formatFoodDateInput(selectedDate), days: 1 })
      .then((data) => {
        if (cancelled) return;
        const dateKey = formatFoodDateInput(selectedDate);
        const logs = (data?.logs || []).filter((log) => !log.date || log.date === dateKey);
        logs.sort((a, b) => String(a.entryTime || "").localeCompare(String(b.entryTime || "")));
        setMeals(logs.map(mapMealLogToUi));
        if (
          !jumpedToLatestRef.current
          && logs.length === 0
          && formatFoodDateInput(selectedDate) === formatFoodDateInput(today)
        ) {
          jumpedToLatestRef.current = true;
          fetchUserMealTracking(userId, { date: formatFoodDateInput(today), days: 21 })
            .then((rangeData) => {
              if (cancelled) return;
              const latest = (rangeData?.logs || []).find((log) => log?.date);
              const nextDate = latest?.date ? parseFoodDateInput(latest.date) : null;
              if (nextDate && nextDate.toDateString() !== selectedDate.toDateString()) {
                setSelectedDate(nextDate);
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setMeals([]);
        onToast?.(err?.message || "Failed to load meals");
      })
      .finally(() => {
        if (!cancelled) setMealsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [live, onToast, selectedDate, today, userId]);

  useEffect(() => {
    if (!live || tab !== "water") return undefined;
    let cancelled = false;
    setWaterLoading(true);
    fetchUserWaterTracking(userId, {
      from: formatFoodDateInput(waterRange.from),
      to: formatFoodDateInput(waterRange.to),
    })
      .then((data) => {
        if (cancelled) return;
        setWaterHistory(data?.history || []);
        const goal = Number(data?.settings?.goalGlasses);
        if (Number.isFinite(goal) && goal >= 0) {
          setWaterGoal(goal);
          setWaterGoalDraft(goal);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setWaterHistory([]);
        onToast?.(err?.message || "Failed to load water intake");
      })
      .finally(() => {
        if (!cancelled) setWaterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [live, onToast, tab, userId, waterRange.from, waterRange.to]);

  async function toggleDietPlan() {
    const next = !dietPlanOn;
    if (!live) {
      setDietPlanOn(next);
      onToast?.(next ? "Diet plan enabled in the client app" : "Diet plan hidden from the client app");
      return;
    }
    if (dietPlanBusy) return;
    setDietPlanBusy(true);
    try {
      const enabled = await updateUserDietPlanEnabled(userId, next);
      setDietPlanOn(enabled !== false);
      try {
        const row = await fetchUser(userId);
        if (row) onUserUpdated?.(row);
      } catch {
        // Toggle already saved; profile refresh is best-effort.
      }
      onToast?.(enabled !== false ? "Diet plan enabled in the client app" : "Diet plan hidden from the client app");
    } catch (err) {
      onToast?.(err?.message || "Failed to update diet plan visibility");
    } finally {
      setDietPlanBusy(false);
    }
  }

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

    if (!live || modeBusy) return;
    setModeBusy(true);
    updateUserMealTrackingMode(userId, next === "detailed" ? "detailed_macro" : "macro")
      .then(() => onToast(next === "detailed" ? "Detailed macro mode set for client app" : "Macro mode set for client app"))
      .catch((err) => onToast(err?.message || "Failed to update meal tracking mode"))
      .finally(() => setModeBusy(false));
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

  async function approveMeal(id) {
    const meal = meals.find((m) => m.id === id);
    if (!meal) return;
    if (!live) {
      setMeals((list) => list.map((m) => (m.id === id ? { ...m, aiStatus: "approved" } : m)));
      onToast("Meal approved");
      return;
    }
    setBusyId(id);
    try {
      const updated = await reviewUserMealLog(id, {
        status: "approved",
        proteinGm: meal.macros?.protein,
        fatsGm: meal.macros?.fat,
        carbsGm: meal.macros?.carbs,
        caloriesKcal: meal.macros?.calories,
      });
      setMeals((list) => list.map((m) => (m.id === id ? mapMealLogToUi(updated) : m)));
      onToast("Meal approved");
    } catch (err) {
      onToast(err?.message || "Failed to approve meal");
    } finally {
      setBusyId("");
    }
  }

  async function saveMealEdit(id, macros) {
    if (!live) {
      setMeals((list) => list.map((m) => (m.id === id ? { ...m, macros, aiStatus: "review" } : m)));
      return;
    }
    setBusyId(id);
    try {
      const updated = await updateUserMealLog(userId, id, {
        proteinGm: macros.protein,
        fatsGm: macros.fat,
        carbsGm: macros.carbs,
        caloriesKcal: macros.calories,
      });
      setMeals((list) => list.map((m) => (m.id === id ? mapMealLogToUi(updated) : m)));
    } catch (err) {
      onToast(err?.message || "Failed to save meal macros");
      throw err;
    } finally {
      setBusyId("");
    }
  }

  function saveWaterGoal() {
    setWaterGoal(waterGoalDraft);
    setWaterGoalEditing(false);
    onToast(live ? "Water goal is set by the client in the app" : "Water goal updated");
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
              disabled={modeBusy}
              onChange={setMode}
            />
          </div>
          <div className="ua-cp-food__control ua-cp-food__control--diet">
            <span className="ua-cp-food__control-label">Diet plan</span>
            <button
              type="button"
              className={`ua-toggle${dietPlanOn ? " ua-toggle--on" : ""}`}
              aria-pressed={dietPlanOn}
              aria-label="Show diet plan in client app"
              disabled={dietPlanBusy}
              onClick={toggleDietPlan}
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
            today={today}
            onDateChange={setSelectedDate}
            onToday={() => setSelectedDate(today)}
          />
          <TargetedMacrosCard consumed={consumed} targets={macroTargets} />
          <MealsPanel
            meals={meals}
            mode="macro"
            live={live}
            busyId={busyId}
            dayTotal={dayTotal}
            listLabel="meals"
            dateLabel={dateLabel}
            loading={mealsLoading}
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
            today={today}
            onDateChange={setSelectedDate}
            onToday={() => setSelectedDate(today)}
          />
          <TargetedMacrosCard consumed={consumed} targets={macroTargets} />
          <MealsPanel
            meals={meals}
            mode="detailed"
            live={live}
            busyId={busyId}
            dayTotal={dayTotal}
            listLabel="logged food"
            dateLabel={dateLabel}
            loading={mealsLoading}
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
              today={today}
              onApply={(next) => {
                setWaterRange(next);
                onToast(`Water history updated · ${formatFoodDateLabel(next.from, today)} – ${formatFoodDateLabel(next.to, today)}`);
              }}
            />
            <WaterGoalBar
              goal={waterGoal}
              dietPlanOn={dietPlanOn}
              editing={waterGoalEditing}
              draftGoal={waterGoalDraft}
              canEdit={!live}
              onStartEdit={() => { setWaterGoalDraft(waterGoal); setWaterGoalEditing(true); }}
              onCancel={() => setWaterGoalEditing(false)}
              onSave={saveWaterGoal}
              onDraftChange={setWaterGoalDraft}
            />
          </div>
          {waterLoading ? (
            <p className="ua-page-head__sub">Loading water intake…</p>
          ) : (
            <WaterChartCard chart={waterChart} goal={waterGoal} todayDay={waterChart.todayDay} />
          )}
        </>
      ) : null}

      {tab === "diet" ? <DietPlanPanel user={user} onToast={onToast} appVisible={dietPlanOn} /> : null}

      {photoMeal ? <MealPhotoModal meal={photoMeal} dateLabel={dateLabel} onClose={() => setPhotoMeal(null)} /> : null}
    </div>
  );
}
