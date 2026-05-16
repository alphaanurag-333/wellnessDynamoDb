import { useRef, useState } from "react";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateHealthTool, adminUpdateHealthTool } from "../../api/adminHealthTools.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";
import {
  DESCRIPTION_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  IMAGE_MAX_SIZE_BYTES,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
  emptyForm,
  isAllowedHealthToolIconFile,
  sanitizeDescription,
  sanitizeTitle,
  validateForm,
} from "./HealthToolShared.js";

export function HealthToolForm({ mode = "create", initialTool = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialTool) return emptyForm();
    return {
      title: initialTool.title || "",
      description: initialTool.description || "",
      status: initialTool.status || "active",
    };
  });
  const editId = isEditMode && initialTool ? initialTool._id || initialTool.id || "" : "";
  const editBaselineIcon = isEditMode && initialTool ? initialTool.icon || "" : "";
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(() =>
    isEditMode && initialTool?.icon ? mediaUrl(initialTool.icon) : ""
  );
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setForm(emptyForm());
    setIconFile(null);
    setIconPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const validationError = validateForm(form, {
      editId,
      iconFile,
      hasExistingIcon: Boolean(editBaselineIcon && String(editBaselineIcon).trim()),
    });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status || "active",
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateHealthTool(adminToken, editId, payload, iconFile);
        await Swal.fire({ icon: "success", title: "Health tool updated", timer: 1500 });
      } else {
        await adminCreateHealthTool(adminToken, payload, iconFile);
        await Swal.fire({ icon: "success", title: "Health tool created", timer: 1500 });
      }
      navigate("/admin/health-tools");
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
            {form.title.trim().length}/{TITLE_MAX_LEN} (min {TITLE_MIN_LEN})
          </small>
        </label>
        <label className="user-field col-12 col-md-6">
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
            {form.description.trim().length}/{DESCRIPTION_MAX_LEN} (min {DESCRIPTION_MIN_LEN})
          </small>
        </label>
        <label className="user-field col-12">
          <span className="user-field__label">
            Icon image (up to 5 MB){" "}
            {editId ? "(optional — leave unchanged to keep current)" : <span className="required-dot">*</span>}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg"
            className="user-field__input"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file) {
                if (!isAllowedHealthToolIconFile(file)) {
                  setIconFile(null);
                  setIconPreview(editBaselineIcon ? mediaUrl(editBaselineIcon) : "");
                  e.target.value = "";
                  void Swal.fire({ icon: "error", title: "Invalid file", text: "Use JPEG, PNG, GIF, WebP, or SVG only." });
                  return;
                }
                if (file.size > IMAGE_MAX_SIZE_BYTES) {
                  setIconFile(null);
                  setIconPreview(editBaselineIcon ? mediaUrl(editBaselineIcon) : "");
                  e.target.value = "";
                  void Swal.fire({ icon: "error", title: "Validation error", text: "Image must be 5 MB or less." });
                  return;
                }
              }
              setIconFile(file);
              setIconPreview(file ? URL.createObjectURL(file) : editBaselineIcon ? mediaUrl(editBaselineIcon) : "");
            }}
          />
        </label>
      </div>
      {iconPreview ? (
        <div style={{ marginTop: 10 }}>
          <AdminMediaImage path={editBaselineIcon} src={iconPreview || undefined} width={72} height={72} radius={8} alt="" />
        </div>
      ) : null}
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-tools")}>
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

export function HealthToolAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create health tool</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-tools")}>
            Back to list
          </button>
        </div>
        <HealthToolForm mode="create" />
      </div>
    </div>
  );
}
