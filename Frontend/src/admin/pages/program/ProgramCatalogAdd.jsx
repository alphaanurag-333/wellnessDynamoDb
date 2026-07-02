import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateProgramCatalog } from "../../api/adminProgramCatalog.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  DESCRIPTION_MAX_LEN,
  PROGRAM_TYPE_OPTIONS,
  TITLE_MAX_LEN,
  emptyForm,
  toPayload,
  validateForm,
} from "./ProgramCatalogShared.js";

export function ProgramCatalogAdd() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm(form);
    if (errors.length) {
      await Swal.fire({ icon: "error", title: "Validation", html: errors.join("<br/>") });
      return;
    }
    if (!adminToken) return;
    setSaving(true);
    try {
      await adminCreateProgramCatalog(adminToken, toPayload(form));
      await Swal.fire({ icon: "success", title: "Program created", timer: 1500 });
      navigate("/admin/programs");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not create program." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-page">
      <form className="page-card form-card" onSubmit={onSubmit}>
        <AdminPageHeader title="Add Wellness Program" backTo="/admin/programs" />
        <div className="row g-3">
          <label className="user-field col-12 col-md-8">
            <span className="user-field__label">Title <span className="required-dot">*</span></span>
            <input
              className="user-field__input"
              value={form.title}
              maxLength={TITLE_MAX_LEN}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label className="user-field col-12 col-md-4">
            <span className="user-field__label">Program type <span className="required-dot">*</span></span>
            <select
              className="user-field__input"
              value={form.programType}
              onChange={(e) => setForm((f) => ({ ...f, programType: e.target.value }))}
            >
              {PROGRAM_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="user-field col-12 col-md-4">
            <span className="user-field__label">Price (INR) <span className="required-dot">*</span></span>
            <input
              className="user-field__input"
              type="number"
              min="1"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
            />
          </label>
          <label className="user-field col-12">
            <span className="user-field__label">Description</span>
            <textarea
              className="user-field__input"
              rows={4}
              maxLength={DESCRIPTION_MAX_LEN}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <label className="user-field col-12 col-md-4" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            <span className="user-field__label" style={{ margin: 0 }}>Active (visible to coaches)</span>
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/programs")}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Saving..." : "Create program"}</button>
        </div>
      </form>
    </div>
  );
}
