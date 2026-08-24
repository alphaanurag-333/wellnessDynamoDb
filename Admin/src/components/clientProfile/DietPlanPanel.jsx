import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assignUserDietPlan,
  deleteUserDietPlanAssignment,
  listDietPlanCatalog,
  listUserDietPlanAssignments,
} from "../../api/dietPlanCatalogApi.js";
import { useViewAs } from "../../context/ViewAsContext.jsx";

const SLOT_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function todayIsoDate() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDateLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function mealsToSections(meals) {
  const grouped = new Map();
  (Array.isArray(meals) ? meals : []).forEach((meal, index) => {
    const slot = meal.slot && SLOT_LABELS[meal.slot] ? meal.slot : "other";
    if (!grouped.has(slot)) {
      grouped.set(slot, {
        id: slot,
        title: SLOT_LABELS[slot] || "Meals",
        rows: [],
      });
    }
    const quantity = meal.calories ? `${meal.calories} kcal` : (meal.notes || "—");
    grouped.get(slot).rows.push({
      id: meal.id || `${slot}-${index}`,
      label: meal.title,
      description: meal.foods || meal.notes || "—",
      quantity,
    });
  });
  return [...grouped.values()];
}

function DietPlanSection({ section }) {
  return (
    <div className="ua-cp-food-diet-section">
      <div className="ua-cp-food-diet-section__head">
        <span>{section.title}</span>
        <span className="ua-cp-food-diet-section__qty-label">Quantity</span>
      </div>
      <div className="ua-cp-food-diet-section__body">
        {section.rows.map((row) => (
          <div key={row.id} className="ua-cp-food-diet-row">
            <span className="ua-cp-food-diet-row__label">{row.label}</span>
            <span className="ua-cp-food-diet-row__desc">{row.description}</span>
            <span className="ua-cp-food-diet-row__qty">{row.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignedPlanCard({ plan }) {
  const sections = mealsToSections(plan.meals);
  return (
    <div className="ua-cp-food-diet-plan">
      <div className="ua-cp-food-diet-plan__meta">
        <strong>{plan.name || "Diet plan"}</strong>
        <span>
          {[plan.category, plan.type].filter(Boolean).join(" · ") || "Catalog plan"}
        </span>
        {plan.description ? <p>{plan.description}</p> : null}
      </div>
      {sections.length ? sections.map((section) => (
        <DietPlanSection key={`${plan.id}-${section.id}`} section={section} />
      )) : (
        <p className="ua-cp-food-diet__empty">No meals listed on this plan.</p>
      )}
    </div>
  );
}

export function DietPlanPanel({ user, onToast, appVisible = true }) {
  const userId = String(user?.id || "").trim();
  const isHealClient = String(user?.userTier || "").toLowerCase() === "heal" || user?.tier === "Seek to Heal";
  const { can } = useViewAs();
  const canAssign = can("console.diet.create");
  const canRemove = can("console.diet.delete");

  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [startDate, setStartDate] = useState(todayIsoDate);
  const [note, setNote] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const catalogData = await listDietPlanCatalog({ status: "active", limit: 100 });
      setCatalog(catalogData?.plans || []);
      if (!isHealClient) {
        setRecommended(null);
        setHistory([]);
        return;
      }
      const assignmentData = await listUserDietPlanAssignments(userId);
      setRecommended(assignmentData?.recommended || null);
      setHistory(assignmentData?.history || []);
    } catch (err) {
      setError(err?.message || "Failed to load diet plans");
      onToast?.(err?.message || "Failed to load diet plans");
    } finally {
      setLoading(false);
    }
  }, [isHealClient, onToast, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPlans = useMemo(
    () => catalog.filter((plan) => selectedIds.includes(plan.id)),
    [catalog, selectedIds],
  );

  function togglePlan(id) {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  async function handleAssign() {
    if (!selectedIds.length) {
      onToast?.("Select at least one diet plan");
      return;
    }
    if (!startDate) {
      onToast?.("Start date is required");
      return;
    }
    setSaving(true);
    try {
      await assignUserDietPlan(userId, {
        planIds: selectedIds,
        startDate,
        note,
      });
      setAssignOpen(false);
      setSelectedIds([]);
      setNote("");
      setStartDate(todayIsoDate());
      onToast?.("Diet plan assigned & synced to client app");
      await load();
    } catch (err) {
      onToast?.(err?.message || "Could not assign diet plan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(assignmentId) {
    if (!assignmentId) return;
    setSaving(true);
    try {
      await deleteUserDietPlanAssignment(userId, assignmentId);
      onToast?.("Diet plan assignment removed");
      await load();
    } catch (err) {
      onToast?.(err?.message || "Could not remove assignment");
    } finally {
      setSaving(false);
    }
  }

  if (!userId) {
    return <p className="ua-cp-food-diet__empty">Client is required to load a diet plan.</p>;
  }

  return (
    <div className="ua-cp-food-diet">
      {!appVisible ? (
        <p className="ua-cp-food-diet__empty">Diet plan is hidden from the client app. Turn the toggle on to show it again.</p>
      ) : null}
      <div className="ua-cp-food-diet__head">
        <div>
          <strong className="ua-cp-food-diet__title">Personalised diet plan</strong>
          <span className="ua-cp-food-diet__sub">
            {recommended
              ? `Current plan from ${formatDateLabel(recommended.startDate) || "coach assignment"}`
              : "Pick a catalog plan and assign it to this client"}
          </span>
        </div>
        {canAssign && isHealClient ? (
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm ua-cp-food-diet__edit"
            onClick={() => setAssignOpen((open) => !open)}
            disabled={saving || loading}
          >
            {assignOpen ? "Close catalog" : recommended ? "Replace plan" : "Assign plan"}
          </button>
        ) : null}
      </div>

      {loading ? <p className="ua-cp-food-diet__empty">Loading diet plan…</p> : null}
      {error && !loading ? <p className="ua-cp-food-diet__empty">{error}</p> : null}

      {!isHealClient && !loading ? (
        <p className="ua-cp-food-diet__empty">Diet plans can only be assigned to Heal (paid) clients.</p>
      ) : null}

      {assignOpen && canAssign && isHealClient ? (
        <div className="ua-cp-food-diet-assign">
          <div className="ua-cp-food-diet-assign__fields">
            <label>
              Start date
              <input
                type="date"
                value={startDate}
                data-allow-future="true"
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label>
              Note (optional)
              <input
                type="text"
                value={note}
                placeholder="Shown to the client"
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
          <div className="ua-cp-food-diet-catalog">
            {catalog.length ? catalog.map((plan) => {
              const checked = selectedIds.includes(plan.id);
              return (
                <button
                  key={plan.id}
                  type="button"
                  className={`ua-cp-food-diet-catalog__item${checked ? " ua-cp-food-diet-catalog__item--on" : ""}`}
                  onClick={() => togglePlan(plan.id)}
                >
                  <strong>{plan.name}</strong>
                  <span>{[plan.category, plan.type].filter(Boolean).join(" · ")}</span>
                  {plan.description ? <em>{plan.description}</em> : null}
                </button>
              );
            }) : (
              <p className="ua-cp-food-diet__empty">No active catalog plans available.</p>
            )}
          </div>
          <div className="ua-cp-food-diet__actions">
            <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => setAssignOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
              onClick={handleAssign}
              disabled={saving || !selectedPlans.length}
            >
              {saving
                ? "Assigning…"
                : selectedPlans.length
                  ? `Assign ${selectedPlans.length} plan${selectedPlans.length === 1 ? "" : "s"}`
                  : "Assign plan"}
            </button>
          </div>
        </div>
      ) : null}

      {recommended && !loading ? (
        <div className="ua-cp-food-diet-current">
          {recommended.note ? <p className="ua-cp-food-diet__note">{recommended.note}</p> : null}
          {(recommended.plans || []).map((plan) => (
            <AssignedPlanCard key={plan.id} plan={plan} />
          ))}
          {canRemove ? (
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
              onClick={() => handleDelete(recommended.id)}
              disabled={saving}
            >
              Remove current assignment
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && isHealClient && !recommended && !assignOpen && !error ? (
        <p className="ua-cp-food-diet__empty" style={{textAlign:"center"}}>No diet plan assigned yet.</p>
      ) : null}

      {history.length ? (
        <div className="ua-cp-food-diet-history">
          <strong>Previous assignments</strong>
          {history.map((entry) => (
            <div key={entry.id} className="ua-cp-food-diet-history__row">
              <span>{formatDateLabel(entry.startDate) || "—"}</span>
              <span>{entry.plans.map((plan) => plan.name).filter(Boolean).join(", ") || "Diet plan"}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
