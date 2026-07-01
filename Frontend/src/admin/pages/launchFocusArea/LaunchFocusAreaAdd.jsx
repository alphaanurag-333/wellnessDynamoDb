import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateLaunchFocusArea, adminUpdateLaunchFocusArea } from "../../api/adminLaunchFocusAreas.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { TITLE_MAX_LEN, TITLE_MIN_LEN, emptyForm, sanitizeTitle, validateForm } from "./LaunchFocusAreaShared.js";

export function LaunchFocusAreaForm({ mode = "create", initialItem = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialItem) return emptyForm();
    return {
      title: initialItem.title || "",
      sortOrder: initialItem.sortOrder ?? 0,
      status: initialItem.status || "active",
    };
  });
  const editId = isEditMode && initialItem ? initialItem._id || initialItem.id || "" : "";

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
      sortOrder: Number(form.sortOrder) || 0,
      status: form.status || "active",
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateLaunchFocusArea(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Updated", timer: 1500 });
      } else {
        await adminCreateLaunchFocusArea(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Created", timer: 1500 });
      }
      navigate("/admin/launch-focus-areas");
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
        <label className="user-field col-12 col-md-8">
          <span className="user-field__label">
            Title <span className="required-dot">*</span>
          </span>
          <textarea
            className="user-field__input"
            rows={3}
            value={form.title}
            minLength={TITLE_MIN_LEN}
            maxLength={TITLE_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, title: sanitizeTitle(e.target.value) }))}
            placeholder="Improve morning hydration and reduce caffeine intake"
            required
          />
          <small className="data-table__muted">
            {form.title.trim().length}/{TITLE_MAX_LEN}
          </small>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Sort order</span>
          <input
            className="user-field__input"
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
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
      <div className="user-form__actions">
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/launch-focus-areas")}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

export function LaunchFocusAreaAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader title="Add area to focus" subtitle="Create an item coaches can assign after LAUNCH scoring." backTo="/admin/launch-focus-areas" />
      <div className="page-card">
        <LaunchFocusAreaForm mode="create" />
      </div>
    </div>
  );
}
