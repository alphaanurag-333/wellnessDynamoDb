import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateWellnessPrescriptionCatalog,
  adminUpdateWellnessPrescriptionCatalog,
} from "../../api/adminWellnessPrescriptionCatalog.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  CATEGORY_MAX_LEN,
  CATEGORY_MIN_LEN,
  MAX_POINTS,
  POINT_MAX_LEN,
  PRESCRIPTION_ID_MAX_LEN,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
  emptyForm,
  emptyPoint,
  formFromPrescription,
  sanitizeCategory,
  sanitizePoint,
  sanitizeSequence,
  sanitizeTitle,
  slugify,
  toPayload,
  validateForm,
} from "./WellnessPrescriptionCatalogShared.js";

function PointsEditor({ points, onChange }) {
  const rows = points?.length ? points : [emptyPoint()];

  const updateRow = (index, value) => {
    const next = rows.map((row, i) => (i === index ? value : row));
    onChange(next);
  };

  const addRow = () => {
    if (rows.length >= MAX_POINTS) return;
    onChange([...rows, emptyPoint()]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) {
      onChange([emptyPoint()]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="form-section" style={{ marginTop: 24 }}>
      <div className="form-section__header">
        <div>
          <h3 className="form-card__title" style={{ margin: 0 }}>
            Recommendation points <span className="required-dot">*</span>
          </h3>
          <small className="data-table__muted">Each point appears as a bullet in the user app.</small>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={addRow} disabled={rows.length >= MAX_POINTS}>
          + Add point
        </button>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="row g-3" style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border, #e8e8e8)" }}>
          <label className="user-field col-12 col-md-10">
            <span className="user-field__label">
              Point {index + 1} <span className="required-dot">*</span>
            </span>
            <textarea
              className="user-field__input"
              rows={2}
              value={row}
              maxLength={POINT_MAX_LEN}
              onChange={(e) => updateRow(index, sanitizePoint(e.target.value))}
              required
            />
          </label>
          <div className="col-12 col-md-2 d-flex align-items-end">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeRow(index)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <small className="data-table__muted">
        {rows.length}/{MAX_POINTS} points
      </small>
    </div>
  );
}

export function WellnessPrescriptionCatalogForm({ mode = "create", initialPrescription = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() =>
    initialPrescription ? formFromPrescription(initialPrescription) : emptyForm()
  );
  const editId = isEditMode && initialPrescription ? initialPrescription._id || initialPrescription.id || "" : "";

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
        await adminUpdateWellnessPrescriptionCatalog(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Prescription updated", timer: 1500 });
      } else {
        await adminCreateWellnessPrescriptionCatalog(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Prescription created", timer: 1500 });
      }
      navigate("/admin/wellness-prescriptions");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  const resolvedPrescriptionId = slugify(form.prescriptionId || form.title);

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Title <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.title}
            minLength={TITLE_MIN_LEN}
            maxLength={TITLE_MAX_LEN}
            onChange={(e) => {
              const title = sanitizeTitle(e.target.value);
              setForm((p) => ({
                ...p,
                title,
                prescriptionId: p.prescriptionId || slugify(title),
              }));
            }}
            required
          />
          <small className="data-table__muted">
            {form.title.trim().length}/{TITLE_MAX_LEN} (min {TITLE_MIN_LEN})
          </small>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Prescription ID (slug)</span>
          <input
            className="user-field__input"
            value={form.prescriptionId}
            maxLength={PRESCRIPTION_ID_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, prescriptionId: slugify(e.target.value) }))}
            placeholder={resolvedPrescriptionId || "auto-generated-from-title"}
          />
          <small className="data-table__muted">
            {resolvedPrescriptionId.length}/{PRESCRIPTION_ID_MAX_LEN} · lowercase letters, numbers, hyphens
          </small>
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
            placeholder="Lifestyle"
            required
          />
          <small className="data-table__muted">
            {form.category.trim().length}/{CATEGORY_MAX_LEN} (min {CATEGORY_MIN_LEN})
          </small>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Sequence</span>
          <input
            className="user-field__input"
            inputMode="numeric"
            value={form.sequence}
            onChange={(e) => setForm((p) => ({ ...p, sequence: sanitizeSequence(e.target.value) }))}
            placeholder="0"
          />
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <PointsEditor points={form.points} onChange={(points) => setForm((p) => ({ ...p, points }))} />

      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/wellness-prescriptions")}>
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

export function WellnessPrescriptionCatalogAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create wellness prescription"
        subtitle="Define a master prescription template coaches can assign."
        backTo="/admin/wellness-prescriptions"
      />
      <div className="page-card">
        <WellnessPrescriptionCatalogForm mode="create" />
      </div>
    </div>
  );
}
