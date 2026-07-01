import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateTestCatalog, adminUpdateTestCatalog } from "../../api/adminTestCatalog.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  CATEGORY_MAX_LEN,
  MAX_PARAMETERS,
  NAME_MAX_LEN,
  TYPE_OPTIONS,
  emptyForm,
  emptyParameter,
  formFromTest,
  slugify,
  toPayload,
  validateForm,
} from "./TestCatalogShared.js";

function ParametersEditor({ parameters, onChange }) {
  const rows = parameters?.length ? parameters : [emptyParameter(1)];

  const updateRow = (index, patch) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const addRow = () => {
    if (rows.length >= MAX_PARAMETERS) return;
    onChange([...rows, emptyParameter(rows.length + 1)]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) {
      onChange([emptyParameter(1)]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="form-section">
      <div className="form-section__header">
        <span className="user-field__label" style={{ marginBottom: 0 }}>
          Parameters
        </span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={addRow} disabled={rows.length >= MAX_PARAMETERS}>
          + Add parameter
        </button>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="row g-2 align-items-end parameter-row" style={{ marginBottom: 12 }}>
          <label className="user-field col-12 col-md-3">
            <span className="user-field__label">Name</span>
            <input
              className="user-field__input"
              value={row.name}
              onChange={(e) => {
                const name = e.target.value;
                updateRow(index, {
                  name,
                  paramId: row.paramId || slugify(name),
                });
              }}
              required
            />
          </label>
          <label className="user-field col-12 col-md-2">
            <span className="user-field__label">Param ID</span>
            <input
              className="user-field__input"
              value={row.paramId}
              onChange={(e) => updateRow(index, { paramId: slugify(e.target.value) })}
            />
          </label>
          <label className="user-field col-12 col-md-2">
            <span className="user-field__label">Unit</span>
            <input className="user-field__input" value={row.unit} onChange={(e) => updateRow(index, { unit: e.target.value })} />
          </label>
          <label className="user-field col-12 col-md-3">
            <span className="user-field__label">Reference range</span>
            <input
              className="user-field__input"
              value={row.refRange}
              onChange={(e) => updateRow(index, { refRange: e.target.value })}
              placeholder="0.8-1.8"
            />
          </label>
          <div className="col-12 col-md-2">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeRow(index)}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TestCatalogForm({ mode = "create", initialTest = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => (initialTest ? formFromTest(initialTest) : emptyForm()));
  const editId = isEditMode && initialTest ? initialTest._id || initialTest.id || "" : "";

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
        await adminUpdateTestCatalog(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Test updated", timer: 1500 });
      } else {
        await adminCreateTestCatalog(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Test created", timer: 1500 });
      }
      navigate("/admin/test-catalog");
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
            Name <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.name}
            maxLength={NAME_MAX_LEN}
            onChange={(e) => {
              const name = e.target.value;
              setForm((p) => ({
                ...p,
                name,
                testId: p.testId || slugify(name),
              }));
            }}
            required
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Test ID (slug)</span>
          <input
            className="user-field__input"
            value={form.testId}
            onChange={(e) => setForm((p) => ({ ...p, testId: slugify(e.target.value) }))}
          />
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Type</span>
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
            maxLength={CATEGORY_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            placeholder="Hormonal"
            required
          />
        </label>
        <label className="user-field col-12 col-md-2">
          <span className="user-field__label">Sequence</span>
          <input
            className="user-field__input"
            type="number"
            min={0}
            value={form.sequence}
            onChange={(e) => setForm((p) => ({ ...p, sequence: e.target.value }))}
          />
        </label>
        <label className="user-field col-12 col-md-2">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <ParametersEditor parameters={form.parameters} onChange={(parameters) => setForm((p) => ({ ...p, parameters }))} />

      <div className="user-form__actions">
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/test-catalog")}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

export function TestCatalogAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader title="Create test catalog entry" subtitle="Define a blood test and its parameters." backTo="/admin/test-catalog" />
      <div className="page-card">
        <TestCatalogForm mode="create" />
      </div>
    </div>
  );
}
