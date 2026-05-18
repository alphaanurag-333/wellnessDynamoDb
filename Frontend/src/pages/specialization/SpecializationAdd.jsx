import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateSpecialization,
  adminUpdateSpecialization,
} from "../../api/adminSpecializations.js";
import { logout } from "../../store/authSlice.js";
import {
  DESCRIPTION_MAX_LEN,
  TITLE_MAX_LEN,
  emptyForm,
  getSpecializationId,
  sanitizeDescriptionInput,
  sanitizeTitleInput,
  validateSpecializationForm,
} from "./SpecializationShared.js";

export function SpecializationForm({ mode = "create", initialSpecialization = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialSpecialization) return emptyForm();
    return {
      title: initialSpecialization.title || "",
      description: initialSpecialization.description || "",
      status: initialSpecialization.status || "active",
    };
  });
  const editId = isEditMode && initialSpecialization ? getSpecializationId(initialSpecialization) : "";

  const resetForm = () => setForm(emptyForm());

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const validationError = validateSpecializationForm(form);
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status || "active",
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateSpecialization(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Specialization updated", timer: 1500 });
      } else {
        await adminCreateSpecialization(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Specialization created", timer: 1500 });
      }
      navigate("/admin/specializations");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Save failed",
        text: err.message || "Could not save specialization.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <label className="user-field col-12">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Title <span className="required-dot">*</span>
            </span>
            <small>
              {form.title.length}/{TITLE_MAX_LEN}
            </small>
          </span>
          <input
            className="user-field__input"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: sanitizeTitleInput(e.target.value) }))}
            maxLength={TITLE_MAX_LEN}
            required
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Status</span>
          <select
            className="user-field__input"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>Description</span>
            <small>
              {form.description.length}/{DESCRIPTION_MAX_LEN}
            </small>
          </span>
          <textarea
            className="user-field__input"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: sanitizeDescriptionInput(e.target.value) }))}
            maxLength={DESCRIPTION_MAX_LEN}
            placeholder="Optional"
          />
        </label>
      </div>
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/specializations")}>
            Cancel edit
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={resetForm}>
            Reset
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update specialization" : "Create specialization"}
        </button>
      </div>
    </form>
  );
}

export function SpecializationAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create specialization</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/specializations")}>
            Back to list
          </button>
        </div>
        <SpecializationForm mode="create" />
      </div>
    </div>
  );
}
