import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateHealthConcern, adminUpdateHealthConcern } from "../../api/adminHealthConcerns.js";
import { logout } from "../../../store/authSlice.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { AdminImagePicker, ADMIN_IMAGE_PRESETS } from "../../components/AdminImagePicker.jsx";
import { mediaUrl } from "../../../media.js";
import {
  DESCRIPTION_MAX_LEN,
  DESCRIPTION_MIN_LEN,
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
        <div className="user-field col-12 col-md-6">
          <AdminImagePicker
            label="Icon image"
            hint="Square icon for the health concern card. Crop to 200 × 200px after selecting."
            required={!editId}
            optionalLabel={Boolean(editId)}
            outputWidth={ADMIN_IMAGE_PRESETS.icon.width}
            outputHeight={ADMIN_IMAGE_PRESETS.icon.height}
            previewMaxWidth={ADMIN_IMAGE_PRESETS.icon.previewMaxWidth}
            cropTitle="Crop icon image"
            file={iconFile}
            previewUrl={iconPreview}
            baselinePath={editBaselineIcon}
            inputRef={fileInputRef}
            onChange={({ file, previewUrl }) => {
              setIconFile(file);
              setIconPreview(previewUrl);
            }}
          />
        </div>
      </div>
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
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create health concern"
        subtitle="Add a new health concern to your catalog."
        backTo="/admin/health-concerns"
      />
      <div className="page-card">
        <HealthConcernForm mode="create" />
      </div>
    </div>
  );
}
