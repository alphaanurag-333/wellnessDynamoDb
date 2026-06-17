import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateHealthDisorder, adminUpdateHealthDisorder } from "../../api/adminHealthDisorders.js";
import { logout } from "../../../store/authSlice.js";
import {
  DESCRIPTION_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  MAX_SYMPTOM_ROWS,
  SYMPTOM_ITEM_MAX_LEN,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
  emptyForm,
  sanitizeDescription,
  sanitizeSymptomItem,
  sanitizeTitle,
  symptomsFromApi,
  symptomsToPayload,
  validateForm,
} from "./HealthDisorderShared.js";

function SymptomRows({ rows, onChange }) {
  const filledCount = symptomsToPayload(rows).length;

  const updateRow = (index, value) => {
    const next = [...rows];
    next[index] = sanitizeSymptomItem(value);
    onChange(next);
  };

  const addRow = () => {
    if (rows.length >= MAX_SYMPTOM_ROWS) return;
    onChange([...rows, ""]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="user-field col-12">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <span className="user-field__label" style={{ marginBottom: 0 }}>
          Symptoms <span className="required-dot">*</span>
        </span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={addRow} disabled={rows.length >= MAX_SYMPTOM_ROWS}>
          + Add symptom
        </button>
      </div>
      <small className="data-table__muted" style={{ display: "block", marginBottom: 10 }}>
        {filledCount} symptom{filledCount === 1 ? "" : "s"} · max {MAX_SYMPTOM_ROWS} rows
      </small>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((row, index) => (
          <div key={index} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 8, alignItems: "center" }}>
            <span className="data-table__muted" style={{ textAlign: "center", fontSize: 13 }}>
              {index + 1}
            </span>
            <input
              type="text"
              className="user-field__input"
              value={row}
              maxLength={SYMPTOM_ITEM_MAX_LEN}
              placeholder="e.g. Headache"
              onChange={(e) => updateRow(index, e.target.value)}
            />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeRow(index)} title="Remove">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HealthDisorderForm({ mode = "create", initialDisorder = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialDisorder) return emptyForm();
    return {
      title: initialDisorder.title || "",
      description: initialDisorder.description || "",
      symptoms: symptomsFromApi(initialDisorder.symptoms),
      type: initialDisorder.type || "acute",
      status: initialDisorder.status || "active",
    };
  });
  const editId = isEditMode && initialDisorder ? initialDisorder._id || initialDisorder.id || "" : "";

  const resetForm = () => setForm(emptyForm());

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;
    const validationError = validateForm(form);
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      symptoms: symptomsToPayload(form.symptoms),
      type: form.type || "acute",
      status: form.status || "active",
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateHealthDisorder(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Health disorder updated", timer: 1500 });
      } else {
        await adminCreateHealthDisorder(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Health disorder created", timer: 1500 });
      }
      navigate("/admin/health-disorders");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

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
            onChange={(e) => setForm((p) => ({ ...p, title: sanitizeTitle(e.target.value) }))}
            minLength={TITLE_MIN_LEN}
            maxLength={TITLE_MAX_LEN}
            required
          />
          <small className="data-table__muted">
            {form.title.trim().length}/{TITLE_MAX_LEN}
          </small>
        </label>
        <label className="user-field col-12 col-md-3">
          <span className="user-field__label">Type</span>
          <select className="user-field__input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="acute">Acute</option>
            <option value="chronic">Chronic</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-3">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12">
          <span className="user-field__label">
            Description <span className="required-dot">*</span>
          </span>
          <textarea
            className="user-field__input"
            rows={4}
            value={form.description}
            minLength={DESCRIPTION_MIN_LEN}
            maxLength={DESCRIPTION_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, description: sanitizeDescription(e.target.value) }))}
            required
          />
          <small className="data-table__muted">
            {form.description.trim().length}/{DESCRIPTION_MAX_LEN}
          </small>
        </label>
        <SymptomRows rows={form.symptoms} onChange={(symptoms) => setForm((p) => ({ ...p, symptoms }))} />
      </div>
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-disorders")}>
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

export function HealthDisorderAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create health disorder</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-disorders")}>
            Back to list
          </button>
        </div>
        <HealthDisorderForm mode="create" />
      </div>
    </div>
  );
}
