import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateDietPlanCatalog, adminUpdateDietPlanCatalog } from "../../api/adminDietPlanCatalog.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  CATEGORY_MAX_LEN,
  CATEGORY_MIN_LEN,
  DESCRIPTION_MAX_LEN,
  MAX_MEALS,
  MEAL_FOODS_MAX_LEN,
  MEAL_NOTES_MAX_LEN,
  MEAL_TITLE_MAX_LEN,
  NAME_MAX_LEN,
  NAME_MIN_LEN,
  PLAN_ID_MAX_LEN,
  SLOT_OPTIONS,
  TYPE_OPTIONS,
  emptyForm,
  emptyMeal,
  formFromPlan,
  sanitizeCategory,
  sanitizeDescription,
  sanitizeName,
  sanitizeSequence,
  slugify,
  toPayload,
  validateForm,
} from "./DietPlanCatalogShared.js";

function MealsEditor({ meals, onChange }) {
  const rows = meals?.length ? meals : [emptyMeal(1)];

  const updateRow = (index, patch) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const addRow = () => {
    if (rows.length >= MAX_MEALS) return;
    onChange([...rows, emptyMeal(rows.length + 1)]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) {
      onChange([emptyMeal(1)]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="form-section" style={{ marginTop: 24 }}>
      <div className="form-section__header">
        <div>
          <h3 className="form-card__title" style={{ margin: 0 }}>
            Meals <span className="required-dot">*</span>
          </h3>
          <small className="data-table__muted">Add at least one meal entry for this diet plan.</small>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={addRow} disabled={rows.length >= MAX_MEALS}>
          + Add meal
        </button>
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          className="row g-3"
          style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border, #e8e8e8)" }}
        >
          <label className="user-field col-12 col-md-3">
            <span className="user-field__label">
              Title <span className="required-dot">*</span>
            </span>
            <input
              className="user-field__input"
              value={row.title}
              maxLength={MEAL_TITLE_MAX_LEN}
              onChange={(e) => {
                const title = e.target.value.slice(0, MEAL_TITLE_MAX_LEN);
                updateRow(index, {
                  title,
                  mealId: row.mealId || slugify(title),
                });
              }}
              required
            />
            <small className="data-table__muted">
              {String(row.title || "").trim().length}/{MEAL_TITLE_MAX_LEN}
            </small>
          </label>
          <label className="user-field col-12 col-md-2">
            <span className="user-field__label">Meal ID</span>
            <input
              className="user-field__input"
              value={row.mealId}
              maxLength={PLAN_ID_MAX_LEN}
              onChange={(e) => updateRow(index, { mealId: slugify(e.target.value) })}
              placeholder="auto-generated"
            />
          </label>
          <label className="user-field col-12 col-md-2">
            <span className="user-field__label">Day</span>
            <input
              className="user-field__input"
              value={row.day}
              onChange={(e) => updateRow(index, { day: e.target.value.trim() || "all" })}
              placeholder="all"
            />
          </label>
          <label className="user-field col-12 col-md-2">
            <span className="user-field__label">Slot</span>
            <select className="user-field__input" value={row.slot} onChange={(e) => updateRow(index, { slot: e.target.value })}>
              {SLOT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="user-field col-12 col-md-2">
            <span className="user-field__label">Calories</span>
            <input
              className="user-field__input"
              inputMode="numeric"
              value={row.calories}
              onChange={(e) => updateRow(index, { calories: e.target.value.replace(/[^\d]/g, "").slice(0, 6) })}
              placeholder="optional"
            />
          </label>
          <label className="user-field col-12 col-md-6">
            <span className="user-field__label">Foods</span>
            <textarea
              className="user-field__input"
              rows={2}
              value={row.foods}
              maxLength={MEAL_FOODS_MAX_LEN}
              onChange={(e) => updateRow(index, { foods: e.target.value.slice(0, MEAL_FOODS_MAX_LEN) })}
              placeholder="List foods or ingredients"
            />
            <small className="data-table__muted">
              {String(row.foods || "").length}/{MEAL_FOODS_MAX_LEN}
            </small>
          </label>
          <label className="user-field col-12 col-md-4">
            <span className="user-field__label">Notes</span>
            <textarea
              className="user-field__input"
              rows={2}
              value={row.notes}
              maxLength={MEAL_NOTES_MAX_LEN}
              onChange={(e) => updateRow(index, { notes: e.target.value.slice(0, MEAL_NOTES_MAX_LEN) })}
              placeholder="Optional notes"
            />
            <small className="data-table__muted">
              {String(row.notes || "").length}/{MEAL_NOTES_MAX_LEN}
            </small>
          </label>
          <div className="col-12 col-md-2 d-flex align-items-end">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeRow(index)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <small className="data-table__muted">
        {rows.length}/{MAX_MEALS} meals
      </small>
    </div>
  );
}

export function DietPlanForm({ mode = "create", initialPlan = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => (initialPlan ? formFromPlan(initialPlan) : emptyForm()));
  const editId = isEditMode && initialPlan ? initialPlan._id || initialPlan.id || "" : "";

  const resetForm = () => setForm(emptyForm());

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;
    const validationError = validateForm(form);
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }
    const payload = toPayload(form);
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateDietPlanCatalog(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Diet plan updated", timer: 1500 });
      } else {
        await adminCreateDietPlanCatalog(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Diet plan created", timer: 1500 });
      }
      navigate("/admin/diet-plan-catalog");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  const resolvedPlanId = slugify(form.planId || form.name);

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Name <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.name}
            minLength={NAME_MIN_LEN}
            maxLength={NAME_MAX_LEN}
            onChange={(e) => {
              const name = sanitizeName(e.target.value);
              setForm((p) => ({
                ...p,
                name,
                planId: p.planId || slugify(name),
              }));
            }}
            required
          />
          <small className="data-table__muted">
            {form.name.trim().length}/{NAME_MAX_LEN} (min {NAME_MIN_LEN})
          </small>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Plan ID (slug)</span>
          <input
            className="user-field__input"
            value={form.planId}
            maxLength={PLAN_ID_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, planId: slugify(e.target.value) }))}
            placeholder={resolvedPlanId || "auto-generated-from-name"}
          />
          <small className="data-table__muted">
            {resolvedPlanId.length}/{PLAN_ID_MAX_LEN} · lowercase letters, numbers, hyphens
          </small>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Type <span className="required-dot">*</span>
          </span>
          <select className="user-field__input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Category <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.category}
            minLength={CATEGORY_MIN_LEN}
            maxLength={CATEGORY_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, category: sanitizeCategory(e.target.value) }))}
            placeholder="Weight loss"
            required
          />
          <small className="data-table__muted">
            {form.category.trim().length}/{CATEGORY_MAX_LEN} (min {CATEGORY_MIN_LEN})
          </small>
        </label>
        <label className="user-field col-12 col-md-2">
          <span className="user-field__label">Sequence</span>
          <input
            className="user-field__input"
            inputMode="numeric"
            value={form.sequence}
            onChange={(e) => setForm((p) => ({ ...p, sequence: sanitizeSequence(e.target.value) }))}
            placeholder="0"
          />
        </label>
        <label className="user-field col-12 col-md-2">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12">
          <span className="user-field__label">Description</span>
          <textarea
            className="user-field__input"
            rows={3}
            value={form.description}
            maxLength={DESCRIPTION_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, description: sanitizeDescription(e.target.value) }))}
            placeholder="Optional plan overview"
          />
          <small className="data-table__muted">
            {form.description.length}/{DESCRIPTION_MAX_LEN}
          </small>
        </label>
      </div>

      <MealsEditor meals={form.meals} onChange={(meals) => setForm((p) => ({ ...p, meals }))} />

      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/diet-plan-catalog")}>
            Cancel edit
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={resetForm}>
            Reset
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

export function DietPlanCatalogAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create diet plan catalog entry"
        subtitle="Define a diet plan and its meals."
        backTo="/admin/diet-plan-catalog"
      />
      <div className="page-card">
        <DietPlanForm mode="create" />
      </div>
    </div>
  );
}
