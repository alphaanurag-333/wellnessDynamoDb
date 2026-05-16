import { useRef, useState } from "react";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateBanner, adminUpdateBanner } from "../../api/bannerController.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";
import {
  IMAGE_MAX_SIZE_BYTES,
  TITLE_MAX_LEN,
  emptyForm,
  sanitizeTitleInput,
  validateBannerForm,
} from "./BannerShared.js";

export function BannerForm({ mode = "create", initialBanner = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialBanner) return emptyForm();
    return { title: initialBanner.title || "", status: initialBanner.status || "active" };
  });
  const editId = isEditMode && initialBanner ? initialBanner._id || initialBanner.id || "" : "";
  const editBaselineImage = isEditMode && initialBanner ? initialBanner.image || "" : "";
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(() =>
    isEditMode && initialBanner?.image ? mediaUrl(initialBanner.image) : ""
  );
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setForm(emptyForm());
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const validationError = validateBannerForm(form);
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }
    if (!editId && !(imageFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Banner image is required." });
      return;
    }

    const payload = { title: form.title.trim(), status: form.status || "active" };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateBanner(adminToken, editId, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Banner updated", timer: 1500 });
      } else {
        await adminCreateBanner(adminToken, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Banner created", timer: 1500 });
      }
      navigate("/admin/banners");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save banner." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <label className="user-field col-12 col-md-6">
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
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Image (max 5 MB) {editId ? "(optional)" : <span className="required-dot">*</span>}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="user-field__input"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file && file.size > IMAGE_MAX_SIZE_BYTES) {
                setImageFile(null);
                setImagePreview(editBaselineImage ? mediaUrl(editBaselineImage) : "");
                e.target.value = "";
                void Swal.fire({ icon: "error", title: "Validation error", text: "Image size must be 5 MB or less." });
                return;
              }
              setImageFile(file);
              setImagePreview(file ? URL.createObjectURL(file) : editBaselineImage ? mediaUrl(editBaselineImage) : "");
            }}
          />
        </label>
      </div>
      {imagePreview ? (
        <div style={{ marginTop: 10 }}>
          <AdminMediaImage path={editBaselineImage} src={imagePreview || undefined} width={120} height={70} radius={8} alt="Banner preview" />
        </div>
      ) : null}
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/banners")}>
            Cancel edit
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={resetForm}>
            Reset
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update banner" : "Create banner"}
        </button>
      </div>
    </form>
  );
}

export function BannerAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create banner</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/banners")}>
            Back to list
          </button>
        </div>
        <BannerForm mode="create" />
      </div>
    </div>
  );
}
