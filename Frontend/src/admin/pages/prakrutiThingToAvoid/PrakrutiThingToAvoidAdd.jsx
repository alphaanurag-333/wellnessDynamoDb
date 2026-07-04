import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreatePrakrutiThingToAvoid, adminUpdatePrakrutiThingToAvoid } from "../../api/adminPrakrutiThingsToAvoid.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  SORT_ORDER_MAX,
  SORT_ORDER_MIN,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
  emptyForm,
  sanitizeSortOrder,
  sanitizeTitle,
  validateForm,
} from "./PrakrutiThingToAvoidShared.js";

export function PrakrutiThingToAvoidForm({ mode = "create", initialItem = null }) {
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
        await adminUpdatePrakrutiThingToAvoid(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Updated", timer: 1500 });
      } else {
        await adminCreatePrakrutiThingToAvoid(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Created", timer: 1500 });
      }
      navigate("/admin/prakruti-things-to-avoid");
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
            placeholder="Avoid skipping breakfast and prolonged fasting"
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
            min={SORT_ORDER_MIN}
            max={SORT_ORDER_MAX}
            step={1}
            value={form.sortOrder}
            onChange={(e) => setForm((p) => ({ ...p, sortOrder: sanitizeSortOrder(e.target.value) }))}
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
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/prakruti-things-to-avoid")}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

export function PrakrutiThingToAvoidAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Add thing to avoid"
        subtitle="Create an item coaches can assign in Prakruti guidance."
        backTo="/admin/prakruti-things-to-avoid"
      />
      <div className="page-card">
        <PrakrutiThingToAvoidForm mode="create" />
      </div>
    </div>
  );
}
