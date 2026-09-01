import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PillTabs } from "../shared.jsx";
import { ConfirmDialog } from "../ConfirmDialog.jsx";
import {
  buildWaterChartFromHistory,
  formatFoodDateInput,
  formatFoodDateLabel,
  parseFoodDateInput,
  localToday,
  latestBmrTdee,
  mapMealLogToUi,
  macroPct,
  macroTargetsFromTdee,
  normalizeMealItems,
  roundMacros,
  sumMealMacros,
  sumItemsMacros,
  scaleItemQuantity,
  formatApproxMacro,
} from "../../data/foodData.js";
import { fetchUserBodyAnalytics, fetchUser } from "../../api/usersApi.js";
import {
  fetchUserMealTracking,
  fetchUserWaterTracking,
  reviewUserMealLog,
  updateUserMealLog,
  deleteUserMealLog,
  updateUserMealTrackingMode,
  updateUserWaterGoal,
  analyzeUserMealLog,
} from "../../api/mealTrackingApi.js";
import { updateUserDietPlanEnabled } from "../../api/dietPlanCatalogApi.js";
import { MealPhotoModal } from "./MealPhotoModal.jsx";
import { FoodDateRow, FoodWaterHistoryPicker } from "./FoodDatePicker.jsx";
import { DietPlanPanel } from "./DietPlanPanel.jsx";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";
import { isMockNumericId } from "../../utils/isMockNumericId.js";

function isLiveUserId(userId) {
  return Boolean(userId) && !isMockNumericId(userId);
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
        <span className="ua-cp-food-macros-card__title">Targeted macros <font style={{color:"rgb(154, 166, 184)"}}>· consumed vs target </font></span>
        <div className="ua-cp-food-macros-card__badges">
          <span className="ua-cp-food-meta-badge"><font style={{color:"rgb(154, 166, 184)"}}>BMR</font> {(targets.bmr || 0).toLocaleString()} kcal</span>
          <span className="ua-cp-food-meta-badge"><font style={{color:"rgb(154, 166, 184)"}}>TDEE</font> {(targets.tdee || 0).toLocaleString()} kcal</span>
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

function emptyMealDraft(meal) {
  return {
    macros: meal?.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 },
    items: normalizeMealItems(meal?.items),
    description: String(meal?.description || ""),
  };
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function buildItemsCopyText(items) {
  const header = "Food Item\tCalories\tProtein\tCarbs\tFat";
  const rows = items.map((item) => {
    const label = item.quantityGm > 0 && !/\(\s*~?\s*\d/.test(item.name)
      ? `${item.name} (~${item.quantityGm} g)`
      : item.name;
    return [
      label,
      formatApproxMacro(item.caloriesKcal || 0, "kcal"),
      formatApproxMacro(item.proteinGm || 0, "g"),
      formatApproxMacro(item.carbsGm || 0, "g"),
      formatApproxMacro(item.fatsGm || 0, "g"),
    ].join("\t");
  });
  return [header, ...rows].join("\n");
}

function MealItemsEditor({ items, editing, onChange, onToast }) {
  const hasMacroBreakdown = items.some(
    (item) => item.proteinGm || item.fatsGm || item.carbsGm || item.caloriesKcal,
  );

  function updateItems(nextItems) {
    onChange(nextItems);
  }

  function updateItem(index, patch) {
    updateItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function updateItemQuantity(index, newQuantityGm) {
    const scaled = scaleItemQuantity(items[index], newQuantityGm);
    updateItems(items.map((item, i) => (i === index ? scaled : item)));
  }

  function removeItem(index) {
    updateItems(items.filter((_, i) => i !== index));
  }

  function addItem() {
    updateItems([...items, { name: "", quantityGm: 0, proteinGm: 0, fatsGm: 0, carbsGm: 0, caloriesKcal: 0 }]);
  }

  async function copyBreakdown() {
    try {
      await navigator.clipboard.writeText(buildItemsCopyText(items));
      onToast?.("Macro breakdown copied");
    } catch {
      onToast?.("Could not copy to clipboard");
    }
  }

  if (!editing && !items.length) return null;

  const showMacroTable = hasMacroBreakdown || editing;

  return (
    <div className="ua-cp-food-meal-items">
      <div className="ua-cp-food-meal-items__head">
        <span className="ua-cp-food-meal-items__title">{showMacroTable ? "Macro breakdown" : "Items"}</span>
        <div className="ua-cp-food-meal-items__head-actions">
          {showMacroTable && items.length && !editing ? (
            <button type="button" className="ua-cp-food-meal-items__copy" aria-label="Copy macro breakdown" onClick={copyBreakdown}>
              <CopyIcon />
            </button>
          ) : null}
          {editing ? (
            <button type="button" className="ua-cp-food-meal-items__add" onClick={addItem}>
              + Add item
            </button>
          ) : null}
        </div>
      </div>
      {items.length ? (
        <div className={`ua-cp-food-meal-items__list${showMacroTable ? " ua-cp-food-meal-items__list--macro" : ""}`}>
          <div className={`ua-cp-food-meal-items__cols${showMacroTable ? " ua-cp-food-meal-items__cols--macro" : ""}${editing && showMacroTable ? " ua-cp-food-meal-items__cols--macro-edit" : ""}`} aria-hidden="true">
            <span>Food item</span>
            {showMacroTable ? (
              <>
                <span>Calories</span>
                <span>Protein</span>
                <span>Carbs</span>
                <span>Fat</span>
                {editing ? <span className="ua-cp-food-meal-items__macro-val ua-cp-food-meal-items__macro-val--qty-head">Qty (g)</span> : null}
              </>
            ) : (
              <span>Quantity (g)</span>
            )}
            {editing ? <span className="ua-cp-food-meal-items__remove-head" aria-hidden="true" /> : null}
          </div>
          {items.map((item, index) => (
            <div key={`item-${index}`} className={`ua-cp-food-meal-items__row${showMacroTable ? " ua-cp-food-meal-items__row--macro" : ""}${editing && showMacroTable ? " ua-cp-food-meal-items__row--macro-edit" : ""}`}>
              {editing ? (
                <>
                  <input
                    type="text"
                    className="ua-cp-food-meal-items__input"
                    value={item.name}
                    placeholder="Food item"
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                  />
                  {showMacroTable ? (
                    <>
                      <span className="ua-cp-food-meal-items__macro-val">{formatApproxMacro(item.caloriesKcal || 0, "kcal")}</span>
                      <span className="ua-cp-food-meal-items__macro-val">{formatApproxMacro(item.proteinGm || 0, "g")}</span>
                      <span className="ua-cp-food-meal-items__macro-val">{formatApproxMacro(item.carbsGm || 0, "g")}</span>
                      <span className="ua-cp-food-meal-items__macro-val">{formatApproxMacro(item.fatsGm || 0, "g")}</span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        className="ua-cp-food-meal-items__input ua-cp-food-meal-items__input--qty"
                        value={item.quantityGm}
                        placeholder="Qty"
                        title="Quantity in grams"
                        onChange={(e) => updateItemQuantity(index, Number(e.target.value) || 0)}
                      />
                    </>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      className="ua-cp-food-meal-items__input ua-cp-food-meal-items__input--qty"
                      value={item.quantityGm}
                      onChange={(e) => updateItem(index, { quantityGm: Number(e.target.value) || 0 })}
                    />
                  )}
                  <button
                    type="button"
                    className="ua-cp-food-meal-items__remove"
                    aria-label={`Remove ${item.name || "item"}`}
                    onClick={() => removeItem(index)}
                  >
                    ×
                  </button>
                </>
              ) : (
                <>
                  <span className="ua-cp-food-meal-items__name">
                    {item.quantityGm > 0 && !/\(\s*~?\s*\d/.test(item.name)
                      ? `${item.name} (~${item.quantityGm} g)`
                      : item.name}
                  </span>
                  {showMacroTable ? (
                    <>
                      <span className="ua-cp-food-meal-items__macro-val">{formatApproxMacro(item.caloriesKcal || 0, "kcal")}</span>
                      <span className="ua-cp-food-meal-items__macro-val">{formatApproxMacro(item.proteinGm || 0, "g")}</span>
                      <span className="ua-cp-food-meal-items__macro-val">{formatApproxMacro(item.carbsGm || 0, "g")}</span>
                      <span className="ua-cp-food-meal-items__macro-val">{formatApproxMacro(item.fatsGm || 0, "g")}</span>
                    </>
                  ) : (
                    <span className="ua-cp-food-meal-items__qty">{item.quantityGm} g</span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="ua-cp-food-meal-items__empty">No items yet. Add what AI identified or insert manually.</p>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z" />
    </svg>
  );
}

function MealCard({
  meal,
  mode,
  busy,
  analyzing,
  autoEdit,
  canEdit,
  canDelete,
  onSubmitAi,
  onSaveEdit,
  onDelete,
  onOpenPhoto,
  onToast,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => emptyMealDraft(meal));
  const shownMacros = editing ? draft.macros : (meal.macros || draft.macros);
  const shownItems = editing ? draft.items : normalizeMealItems(meal.items);
  const shownDescription = editing ? draft.description : String(meal.description || "");
  const needsAi = meal.aiStatus === "none";
  const declined = meal.aiStatus === "declined";
  const canManualInsert = needsAi || declined;
  const showAnalysis = editing || ((Boolean(meal.macros) || shownItems.length > 0) && !declined);
  const canRunAi =
    Boolean(meal.photoUrl)
    && (meal.photoAiStatus === "none" || meal.photoAiStatus === "failed")
    && meal.aiStatus !== "rejected"
    && meal.aiStatus !== "declined";

  useEffect(() => {
    setDraft(emptyMealDraft(meal));
  }, [meal]);

  useEffect(() => {
    if (autoEdit) setEditing(true);
  }, [autoEdit]);

  function handleItemsChange(items) {
    const itemMacros = sumItemsMacros(items);
    const hasItemMacros = items.some(
      (item) => item.proteinGm || item.fatsGm || item.carbsGm || item.caloriesKcal,
    );
    setDraft((d) => ({
      ...d,
      items,
      macros: hasItemMacros ? itemMacros : d.macros,
    }));
  }

  function startEdit() {
    setDraft(emptyMealDraft(meal));
    setEditing(true);
  }

  async function saveEdit() {
    const items = normalizeMealItems(draft.items);
    const hasItemMacros = items.some(
      (item) => item.proteinGm || item.fatsGm || item.carbsGm || item.caloriesKcal,
    );
    const macros = hasItemMacros ? sumItemsMacros(items) : draft.macros;
    if (
      editing &&
      draft.items.some((item) => !String(item.name || "").trim() && Number(item.quantityGm) > 0)
    ) {
      onToast("Each item needs a name");
      return;
    }
    if (
      editing &&
      draft.items.some((item) => String(item.name || "").trim() && !(Number(item.quantityGm) > 0))
    ) {
      onToast("Each item needs a quantity (g)");
      return;
    }
    try {
      await onSaveEdit(meal.id, {
        macros,
        items,
        description: String(draft.description || "").trim(),
      });
      setEditing(false);
      onToast(canManualInsert ? "Macros inserted manually" : "Meal macros saved");
    } catch {
      // Error toast is handled by the parent save handler.
    }
  }

  const subtitle = [meal.time, mode === "detailed" ? (meal.loggedBy || "entered by client") : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`ua-cp-food-meal${meal.aiStatus === "review" ? " ua-cp-food-meal--review" : ""}${editing ? " ua-cp-food-meal--edit" : ""}${declined ? " ua-cp-food-meal--declined" : ""}`}>
      <div className="ua-cp-food-meal__main">
        <button type="button" className="ua-cp-food-meal__photo" onClick={() => onOpenPhoto(meal)} aria-label={`View ${meal.name} photo`}>
          {meal.photoUrl ? (
            <img src={meal.photoUrl} alt="" className="ua-cp-food-meal__photo-img" />
          ) : (
            <span className="ua-cp-food-meal__photo-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(138, 151, 172)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8"></path></svg></span>
          )}
          <span className="ua-cp-food-meal__photo-swap" aria-hidden="true">⤢</span>
        </button>
        <div className="ua-cp-food-meal__info">
          <strong>{meal.name}</strong>
          <span>{subtitle}</span>
          {editing ? (
            <textarea
              className="ua-cp-food-meal__desc-input"
              rows={2}
              value={draft.description}
              placeholder="Meal description"
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          ) : shownDescription && !declined ? (
            <p className="ua-cp-food-meal__desc">{shownDescription}</p>
          ) : null}
          {declined && meal.declineMessage ? (
            <p className="ua-cp-food-meal__decline">{meal.declineMessage}</p>
          ) : meal.photoAiStatus === "failed" && meal.declineMessage ? (
            <p className="ua-cp-food-meal__decline">{meal.declineMessage}</p>
          ) : null}
        </div>
        <div className="ua-cp-food-meal__actions">
          {canEdit && editing ? (
            <>
              <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" disabled={busy} onClick={() => { setDraft(emptyMealDraft(meal)); setEditing(false); }}>Cancel</button>
              <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" disabled={busy} onClick={saveEdit}>Save</button>
            </>
          ) : (
            <>
              {canEdit && (meal.aiStatus === "review" || meal.aiStatus === "approved") ? (
                <>
                  <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" disabled={busy} onClick={startEdit}>Edit</button>
                  {canRunAi ? (
                    <button type="button" className="ua-cp-btn ua-cp-btn--ai" disabled={busy || analyzing} onClick={() => onSubmitAi(meal.id)}>
                      <SparkIcon /> {analyzing ? "Analyzing…" : "Submit to AI"}
                    </button>
                  ) : null}
                </>
              ) : canEdit && meal.aiStatus === "rejected" ? (
                <span className="ua-cp-food-meal__status">Rejected</span>
              ) : canEdit ? (
                <>
                  <button
                    type="button"
                    className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
                    disabled={busy || analyzing}
                    onClick={startEdit}
                  >
                    Manual insert
                  </button>
                  <button type="button" className="ua-cp-btn ua-cp-btn--ai" disabled={busy || analyzing} onClick={() => onSubmitAi(meal.id)}>
                    <SparkIcon /> {analyzing ? "Analyzing…" : "Submit to AI"}
                  </button>
                </>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm ua-cp-btn--danger"
                  disabled={busy || analyzing}
                  onClick={() => onDelete(meal)}
                >
                  Delete
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
      {showAnalysis ? (
        <div className="ua-cp-food-meal__analysis">
          <MealItemsEditor
            items={shownItems}
            editing={editing}
            onChange={handleItemsChange}
            onToast={onToast}
          />
          <div className="ua-cp-food-meal__macros-wrap">
            <span className="ua-cp-food-meal__macros-title">Macro breakup</span>
            <div className="ua-cp-food-meal__macros">
              <MacroMini tone="green" label="P" value={shownMacros.protein} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, macros: { ...d.macros, protein: v } }))} />
              <MacroMini tone="orange" label="C" value={shownMacros.carbs} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, macros: { ...d.macros, carbs: v } }))} />
              <MacroMini tone="blue" label="F" value={shownMacros.fat} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, macros: { ...d.macros, fat: v } }))} />
              <MacroMini tone="purple" label="KCAL" value={shownMacros.calories} unit="" editing={editing} onChange={(v) => setDraft((d) => ({ ...d, macros: { ...d.macros, calories: v } }))} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MealsPanel({ meals, mode, live, busyId, analyzingId, editAfterAiId, dayTotal, listLabel, dateLabel, loading, canEdit, canDelete, onSubmitAi, onSaveEdit, onDelete, onOpenPhoto, onToast }) {
  return (
    <div className="ua-cp-food-meals">
      <div style={{color:"rgb(22, 35, 63)"}} className="ua-cp-food-meals__head">
        <span>{dateLabel} · {listLabel}</span>
        <span><font style={{color:"rgb(138, 151, 172)"}}>Day total:</font> <strong>{dayTotal} kcal</strong></span>
      </div>
      {loading ? (
        <p className="ua-page-head__sub">Loading meals…</p>
      ) : meals.length ? (
        meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            mode={mode}
            busy={busyId === meal.id}
            analyzing={analyzingId === meal.id}
            autoEdit={editAfterAiId === meal.id}
            canEdit={canEdit}
            canDelete={canDelete}
            onSubmitAi={onSubmitAi}
            onSaveEdit={onSaveEdit}
            onDelete={onDelete}
            onOpenPhoto={onOpenPhoto}
            onToast={onToast}
          />
        ))
      ) : (
        <p className="ua-page-head__sub" style={{textAlign:"center"}}>No meals logged for this date.</p>
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
          <span className="ua-cp-food-water-card__icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
              <path d="M8 3v4" />
              <path d="M16 3v4" />
            </svg>
          </span>
          <div>
            <strong>Water intake</strong>
            <span className="ua-cp-food-water-card__range">{chart.rangeLabel}</span>
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

function WaterGoalBar({ goal, editing, draftGoal, onStartEdit, onCancel, onSave, onDraftChange, canEdit, saving }) {
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
            max={99}
            disabled={saving}
            onChange={(e) => onDraftChange(Number(e.target.value) || 1)}
          />
          <span className="ua-cp-food-water-goal__unit">glasses / day</span>
          <button type="button" className="ua-cp-food-water-goal__cancel" disabled={saving} onClick={onCancel}>Cancel</button>
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" disabled={saving} onClick={onSave}>
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      ) : (
        <>
          <span className="ua-cp-food-water-goal__text">Goal <strong>{goal}</strong> glasses / day</span>
          {canEdit ? (
            <button type="button" className="ua-cp-food-water-goal__set" onClick={onStartEdit}>Set target</button>
          ) : null}
        </>
      )}
    </div>
  );
}

export function FoodSection({ user, onToast, onUserUpdated }) {
  const { canEdit, canDelete } = useClientSectionPermissions("food");
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = String(user?.id || "").trim();
  const live = isLiveUserId(userId);
  const today = useMemo(() => localToday(), []);
  const mode = searchParams.get("mode") === "detailed" ? "detailed" : "macro";
  const tabParam = searchParams.get("tab");
  const [dietPlanOn, setDietPlanOn] = useState(() => user?.dietPlanEnabled !== false);
  const [dietPlanBusy, setDietPlanBusy] = useState(false);
  const [meals, setMeals] = useState([]);
  const [photoMeal, setPhotoMeal] = useState(null);
  const [waterGoal, setWaterGoal] = useState(8);
  const [waterGoalEditing, setWaterGoalEditing] = useState(false);
  const [waterGoalDraft, setWaterGoalDraft] = useState(8);
  const [waterGoalSaving, setWaterGoalSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [waterRange, setWaterRange] = useState(() => defaultWaterRange(today));
  const [macroTargets, setMacroTargets] = useState(() => macroTargetsFromTdee(0, 0));
  const [waterHistory, setWaterHistory] = useState(null);
  const [mealsLoading, setMealsLoading] = useState(live);
  const [waterLoading, setWaterLoading] = useState(false);
  const [modeBusy, setModeBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [editAfterAiId, setEditAfterAiId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const jumpedToLatestRef = useRef(false);

  const dateLabel = formatFoodDateLabel(selectedDate, today);
  const waterChart = useMemo(() => {
    if (live && waterHistory) {
      return buildWaterChartFromHistory(waterHistory, waterRange.from, waterRange.to, today);
    }
    // Never fall back to seed/demo water series for non-live ids.
    return buildWaterChartFromHistory([], waterRange.from, waterRange.to, today);
  }, [live, today, waterHistory, waterRange.from, waterRange.to]);

  const tab = useMemo(() => {
    if (tabParam === "water" || tabParam === "diet") return tabParam;
    if (mode === "detailed") return tabParam === "water" || tabParam === "diet" ? tabParam : "detailed-macro";
    return tabParam === "water" || tabParam === "diet" ? tabParam : "macro";
  }, [mode, tabParam]);

  const consumed = useMemo(() => roundMacros(sumMealMacros(meals)), [meals]);
  const dayTotal = consumed.calories;
  const showMacroCard = meals.some((meal) => meal.aiStatus === "review" || meal.aiStatus === "approved");

  useEffect(() => {
    setSelectedDate(today);
    setWaterRange(defaultWaterRange(today));
    setPhotoMeal(null);
    setWaterHistory(null);
    setMacroTargets(macroTargetsFromTdee(0, 0));
    setMeals([]);
    jumpedToLatestRef.current = false;
    setEditAfterAiId("");
    setPendingDelete(null);
  }, [live, today, userId]);

  useEffect(() => {
    setDietPlanOn(user?.dietPlanEnabled !== false);
  }, [user?.dietPlanEnabled]);

  useEffect(() => {
    if (!live) return;
    const storedMode = user?.mealTrackingMode === "detailed_macro" ? "detailed" : "macro";
    if (storedMode === mode) return;
    // Prefer the user's saved meal mode when the URL didn't pin one.
    if (searchParams.get("mode")) return;
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (storedMode === "detailed") {
        p.set("mode", "detailed");
        if (!p.get("tab") || p.get("tab") === "macro") p.set("tab", "detailed-macro");
      } else {
        p.delete("mode");
        if (p.get("tab") === "detailed-macro") p.delete("tab");
      }
      return p;
    }, { replace: true });
  }, [live, mode, searchParams, setSearchParams, user?.mealTrackingMode]);

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
      setMeals([]);
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
            .catch(() => { });
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

  async function submitAi(id) {
    const meal = meals.find((m) => m.id === id);
    if (!meal) return;
    if (live && !meal.photoUrl) {
      onToast("This meal has no photo to analyse");
      return;
    }
    if (!live) {
      setMeals((list) => list.map((m) => (
        m.id === id
          ? {
            ...m,
            aiStatus: "review",
            photoAiStatus: "analysed",
            reviewStatus: "pending",
            macros: m.macros || { protein: 4, carbs: 22, fat: 1, calories: 118 },
            items: m.items?.length
              ? m.items
              : [
                { name: "Amla juice", quantityGm: 200, proteinGm: 1, fatsGm: 0, carbsGm: 18, caloriesKcal: 76 },
                { name: "Chia seeds", quantityGm: 5, proteinGm: 3, fatsGm: 1, carbsGm: 4, caloriesKcal: 42 },
              ],
            description: m.description || "Functional juice with chia",
            declineMessage: "",
          }
          : m
      )));
      onToast("Meal photo analysed. Review the macros and save.");
      setEditAfterAiId(id);
      return;
    }
    setBusyId(id);
    try {
      const result = await analyzeUserMealLog(userId, id);
      if (!result?.mealLog) return;
      const mapped = mapMealLogToUi(result.mealLog);
      setMeals((list) => list.map((m) => (m.id === id ? mapped : m)));
      if (result.related === false) {
        setEditAfterAiId("");
        onToast(result.message || "Image declined as unrelated. Macros set to 0.");
      } else {
        setEditAfterAiId(id);
        onToast(result.message || "Meal photo analysed. Review the macros and save.");
      }
    } catch (err) {
      onToast(err?.message || "Failed to analyse meal photo");
    } finally {
      setBusyId("");
    }
  }

  async function saveMealEdit(id, { macros, items, description }) {
    const meal = meals.find((m) => m.id === id);
    const nextItems = normalizeMealItems(items);
    if (!live) {
      setMeals((list) => list.map((m) => (
        m.id === id
          ? {
            ...m,
            macros,
            items: nextItems,
            detailedTags: nextItems.map((item) => (
              item.quantityGm > 0 ? `${item.name} · ${item.quantityGm} g` : item.name
            )),
            description: description || m.description,
            aiStatus: "approved",
            reviewStatus: "approved",
            photoAiStatus: "analysed",
          }
          : m
      )));
      return;
    }
    setBusyId(id);
    try {
      let updated = await updateUserMealLog(userId, id, {
        proteinGm: macros.protein,
        fatsGm: macros.fat,
        carbsGm: macros.carbs,
        caloriesKcal: macros.calories,
        items: nextItems,
        ...(description !== undefined ? { description } : {}),
      });
      if (meal?.reviewStatus === "pending") {
        updated = await reviewUserMealLog(id, {
          status: "approved",
          proteinGm: macros.protein,
          fatsGm: macros.fat,
          carbsGm: macros.carbs,
          caloriesKcal: macros.calories,
        });
      }
      setMeals((list) => list.map((m) => (m.id === id ? mapMealLogToUi(updated) : m)));
      setEditAfterAiId("");
    } catch (err) {
      onToast(err?.message || "Failed to save meal macros");
      throw err;
    } finally {
      setBusyId("");
    }
  }

  async function deleteMeal(id) {
    if (!id) return;
    if (!live) {
      setMeals((list) => list.filter((m) => m.id !== id));
      setPhotoMeal((current) => (current?.id === id ? null : current));
      setEditAfterAiId((current) => (current === id ? "" : current));
      onToast("Meal log deleted");
      return;
    }
    setBusyId(id);
    try {
      await deleteUserMealLog(userId, id);
      setMeals((list) => list.filter((m) => m.id !== id));
      setPhotoMeal((current) => (current?.id === id ? null : current));
      setEditAfterAiId((current) => (current === id ? "" : current));
      onToast("Meal log deleted");
    } catch (err) {
      onToast(err?.message || "Failed to delete meal log");
    } finally {
      setBusyId("");
    }
  }

  async function saveWaterGoal() {
    const nextGoal = Math.min(99, Math.max(1, Number(waterGoalDraft) || 1));
    if (!live) {
      setWaterGoal(nextGoal);
      setWaterGoalDraft(nextGoal);
      setWaterGoalEditing(false);
      onToast?.("Water goal updated");
      return;
    }
    if (waterGoalSaving) return;
    setWaterGoalSaving(true);
    try {
      const result = await updateUserWaterGoal(userId, nextGoal);
      const saved = Number(result?.settings?.goalGlasses ?? result?.day?.goalGlasses ?? nextGoal);
      setWaterGoal(saved);
      setWaterGoalDraft(saved);
      setWaterGoalEditing(false);
      onToast?.("Water intake goal updated");
    } catch (err) {
      onToast?.(err?.message || "Failed to update water goal");
    } finally {
      setWaterGoalSaving(false);
    }
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
              disabled={modeBusy || !canEdit}
              onChange={(next) => {
                if (!canEdit) return;
                setMode(next);
              }}
            />
          </div>
          <div className="ua-cp-food__control ua-cp-food__control--diet">
            <span className="ua-cp-food__control-label">Diet plan</span>
            <button
              type="button"
              className={`ua-toggle${dietPlanOn ? " ua-toggle--on" : ""}`}
              aria-pressed={dietPlanOn}
              aria-label="Show diet plan in client app"
              disabled={dietPlanBusy || !canEdit}
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
          {showMacroCard ? <TargetedMacrosCard consumed={consumed} targets={macroTargets} /> : null}
          <MealsPanel
            meals={meals}
            mode="macro"
            live={live}
            busyId={busyId}
            analyzingId={busyId}
            editAfterAiId={editAfterAiId}
            dayTotal={dayTotal}
            listLabel="meals"
            dateLabel={dateLabel}
            loading={mealsLoading}
            canEdit={canEdit}
            canDelete={canDelete}
            onSubmitAi={submitAi}
            onSaveEdit={saveMealEdit}
            onDelete={setPendingDelete}
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
          {showMacroCard ? <TargetedMacrosCard consumed={consumed} targets={macroTargets} /> : null}
          <MealsPanel
            meals={meals}
            mode="detailed"
            live={live}
            busyId={busyId}
            analyzingId={busyId}
            editAfterAiId={editAfterAiId}
            dayTotal={dayTotal}
            listLabel="logged food"
            dateLabel={dateLabel}
            loading={mealsLoading}
            canEdit={canEdit}
            canDelete={canDelete}
            onSubmitAi={submitAi}
            onSaveEdit={saveMealEdit}
            onDelete={setPendingDelete}
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
              editing={waterGoalEditing}
              draftGoal={waterGoalDraft}
              canEdit={canEdit}
              saving={waterGoalSaving}
              onStartEdit={() => { setWaterGoalDraft(waterGoal); setWaterGoalEditing(true); }}
              onCancel={() => { setWaterGoalEditing(false); setWaterGoalDraft(waterGoal); }}
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

      <ConfirmDialog
        open={!!pendingDelete}
        tag="Delete meal"
        title={pendingDelete ? `Delete “${pendingDelete.name}”?` : ""}
        body="This removes the meal log from this client's food tracking. You can't undo this."
        cancelLabel="Keep meal"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const meal = pendingDelete;
          setPendingDelete(null);
          if (meal?.id) deleteMeal(meal.id);
        }}
      />
    </div>
  );
}
