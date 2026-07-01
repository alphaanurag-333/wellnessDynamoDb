import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreatePrakrutiRecommendation, adminUpdatePrakrutiRecommendation } from "../../api/adminPrakrutiRecommendations.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { PRAKRUTI_TYPES } from "../../../components/prakrutiShared.js";
import { TITLE_MAX_LEN, TITLE_MIN_LEN, emptyForm, sanitizeTitle, validateForm } from "./PrakrutiRecommendationShared.js";

export function PrakrutiRecommendationForm({ mode = "create", initialItem = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialItem) return emptyForm();
    return {
      prakrutiType: initialItem.prakrutiType || "",
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
      prakrutiType: form.prakrutiType,
      title: form.title.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      status: form.status || "active",
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdatePrakrutiRecommendation(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Updated", timer: 1500 });
      } else {
        await adminCreatePrakrutiRecommendation(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Created", timer: 1500 });
      }
      navigate("/admin/prakruti-recommendations");
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
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Prakruti type <span className="required-dot">*</span>
          </span>
          <select
            className="user-field__input"
            value={form.prakrutiType}
            onChange={(e) => setForm((p) => ({ ...p, prakrutiType: e.target.value }))}
            required
          >
            <option value="">Select Prakruti type</option>
            {PRAKRUTI_TYPES.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
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
        <label className="user-field col-12">
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
            placeholder="Improve digestion with warm meals and routine timing"
            required
          />
          <small className="data-table__muted">
            {form.title.trim().length}/{TITLE_MAX_LEN}
          </small>
        </label>
      </div>
      <div className="user-form__actions">
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/prakruti-recommendations")}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

export function PrakrutiRecommendationAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Add Prakruti recommendation"
        subtitle="Create a recommendation mapped to a Prakruti type."
        backTo="/admin/prakruti-recommendations"
      />
      <div className="page-card">
        <PrakrutiRecommendationForm mode="create" />
      </div>
    </div>
  );
}
