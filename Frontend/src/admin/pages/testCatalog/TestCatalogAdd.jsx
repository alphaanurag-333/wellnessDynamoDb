import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateTestCatalog, adminUpdateTestCatalog } from "../../api/adminTestCatalog.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  CATEGORY_MAX_LEN,
  CATEGORY_MIN_LEN,
  MAX_PARAMETERS,
  NAME_MAX_LEN,
  NAME_MIN_LEN,
  PARAM_NAME_MAX_LEN,
  REF_RANGE_MAX_LEN,
  TEST_ID_MAX_LEN,
  TYPE_OPTIONS,
  UNIT_MAX_LEN,
  emptyForm,
  emptyParameter,
  formFromTest,
  sanitizeCategory,
  sanitizeName,
  sanitizeParamName,
  sanitizeSequence,
  sanitizeText,
  slugify,
  toPayload,
  validateForm,
} from "./TestCatalogShared.js";

function ParametersEditor({ parameters, onChange, testType }) {
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

  const typeHint =
    testType === "PROFILE"
      ? "Profile tests need at least 2 parameters."
      : "Single-parameter tests must have exactly 1 parameter.";

  return (
    <div className="form-section" style={{ marginTop: 24 }}>
      <div className="form-section__header">
        <div>
          <h3 className="form-card__title" style={{ margin: 0 }}>
            Parameters <span className="required-dot">*</span>
          </h3>
          <small className="data-table__muted">{typeHint}</small>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={addRow}
          disabled={rows.length >= MAX_PARAMETERS || testType === "SINGLE"}
        >
          + Add parameter
        </button>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="row g-3" style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border, #e8e8e8)" }}>
          <label className="user-field col-12 col-md-3">
            <span className="user-field__label">
              Name <span className="required-dot">*</span>
            </span>
            <input
              className="user-field__input"
              value={row.name}
              maxLength={PARAM_NAME_MAX_LEN}
              onChange={(e) => {
                const name = sanitizeParamName(e.target.value);
                updateRow(index, {
                  name,
                  paramId: row.paramId || slugify(name),
                });
              }}
              required
            />
            <small className="data-table__muted">
              {String(row.name || "").trim().length}/{PARAM_NAME_MAX_LEN}
            </small>
          </label>
          <label className="user-field col-12 col-md-2">
            <span className="user-field__label">Param ID</span>
            <input
              className="user-field__input"
              value={row.paramId}
              maxLength={TEST_ID_MAX_LEN}
              onChange={(e) => updateRow(index, { paramId: slugify(e.target.value) })}
              placeholder="auto-generated"
            />
            <small className="data-table__muted">
              {String(row.paramId || slugify(row.name)).length}/{TEST_ID_MAX_LEN}
            </small>
          </label>
          <label className="user-field col-12 col-md-2">
            <span className="user-field__label">Unit</span>
            <input
              className="user-field__input"
              value={row.unit}
              maxLength={UNIT_MAX_LEN}
              onChange={(e) => updateRow(index, { unit: sanitizeText(e.target.value, UNIT_MAX_LEN) })}
              placeholder="mg/dL"
            />
            <small className="data-table__muted">
              {String(row.unit || "").trim().length}/{UNIT_MAX_LEN}
            </small>
          </label>
          <label className="user-field col-12 col-md-3">
            <span className="user-field__label">Reference range</span>
            <input
              className="user-field__input"
              value={row.refRange}
              maxLength={REF_RANGE_MAX_LEN}
              onChange={(e) => updateRow(index, { refRange: sanitizeText(e.target.value, REF_RANGE_MAX_LEN) })}
              placeholder="0.8–1.8"
            />
            <small className="data-table__muted">
              {String(row.refRange || "").trim().length}/{REF_RANGE_MAX_LEN}
            </small>
          </label>
          <div className="col-12 col-md-2 d-flex align-items-end">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => removeRow(index)}
              disabled={testType === "SINGLE"}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <small className="data-table__muted">
        {rows.length}/{MAX_PARAMETERS} parameters
      </small>
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

  const resetForm = () => setForm(emptyForm());

  const onTypeChange = (nextType) => {
    setForm((prev) => {
      const parameters =
        nextType === "SINGLE"
          ? [prev.parameters?.[0] || emptyParameter(1)]
          : prev.parameters?.length >= 2
            ? prev.parameters
            : [...(prev.parameters || [emptyParameter(1)]), emptyParameter(2)];
      return { ...prev, type: nextType, parameters };
    });
  };

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

  const resolvedTestId = slugify(form.testId || form.name);

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
                testId: p.testId || slugify(name),
              }));
            }}
            required
          />
          <small className="data-table__muted">
            {form.name.trim().length}/{NAME_MAX_LEN} (min {NAME_MIN_LEN})
          </small>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Test ID (slug)</span>
          <input
            className="user-field__input"
            value={form.testId}
            maxLength={TEST_ID_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, testId: slugify(e.target.value) }))}
            placeholder={resolvedTestId || "auto-generated-from-name"}
          />
          <small className="data-table__muted">
            {resolvedTestId.length}/{TEST_ID_MAX_LEN} · lowercase letters, numbers, hyphens
          </small>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Type <span className="required-dot">*</span>
          </span>
          <select className="user-field__input" value={form.type} onChange={(e) => onTypeChange(e.target.value)}>
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
            placeholder="Hematology"
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
      </div>

      <ParametersEditor
        parameters={form.parameters}
        testType={form.type}
        onChange={(parameters) => setForm((p) => ({ ...p, parameters }))}
      />

      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/test-catalog")}>
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

export function TestCatalogAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create test catalog entry"
        subtitle="Define a blood test and its parameters."
        backTo="/admin/test-catalog"
      />
      <div className="page-card">
        <TestCatalogForm mode="create" />
      </div>
    </div>
  );
}
