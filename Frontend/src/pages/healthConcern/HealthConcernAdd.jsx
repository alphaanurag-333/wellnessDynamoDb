import { useRef, useState } from "react";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateHealthConcern, adminUpdateHealthConcern } from "../../api/adminHealthConcerns.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";
import {
  ALLOWED_IMAGE_TYPES,
  DESCRIPTION_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  IMAGE_MAX_SIZE_BYTES,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
  emptyForm,
  sanitizeDescription,
  sanitizeTitle,
  validateForm,
} from "./HealthConcernShared.js";

export function HealthConcernForm({ mode = "create", initialConcern = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialConcern) return emptyForm();
    return {
      title: initialConcern.title || "",
      description: initialConcern.description || "",
      status: initialConcern.status || "active",
    };
  });
  const editId = isEditMode && initialConcern ? initialConcern._id || initialConcern.id || "" : "";
  const editBaselineIcon = isEditMode && initialConcern ? initialConcern.icon || "" : "";
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(() =>
    isEditMode && initialConcern?.icon ? mediaUrl(initialConcern.icon) : ""
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
        await adminUpdateHealthConcern(adminToken, editId, payload, iconFile);
        await Swal.fire({ icon: "success", title: "Health concern updated", timer: 1500 });
      } else {
        await adminCreateHealthConcern(adminToken, payload, iconFile);
        await Swal.fire({ icon: "success", title: "Health concern created", timer: 1500 });
      }
      navigate("/admin/health-concerns");
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
            accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            className="user-field__input"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file) {
                if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                  setIconFile(null);
                  setIconPreview(editBaselineIcon ? mediaUrl(editBaselineIcon) : "");
                  e.target.value = "";
                  void Swal.fire({ icon: "error", title: "Invalid file", text: "Use JPEG, PNG, GIF, or WebP only." });
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
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-concerns")}>
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

export function HealthConcernAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create health concern</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-concerns")}>
            Back to list
          </button>
        </div>
        <HealthConcernForm mode="create" />
      </div>
    </div>
  );
}
