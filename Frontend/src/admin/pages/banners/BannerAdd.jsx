import { useRef, useState } from "react";
import { ImageCropModal } from "../../components/ImageCropModal.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateBanner, adminUpdateBanner } from "../../api/bannerController.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_HEIGHT,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MAX_SIZE_MB,
  IMAGE_WIDTH,
  TITLE_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  DESCRIPTION_MAX_LEN,
  emptyForm,
  sanitizeTitleInput,
  sanitizeDescriptionInput,
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
    return {
      title: initialBanner.title || "",
      description: initialBanner.description || "",
      status: initialBanner.status || "active",
    };
  });
  const editId = isEditMode && initialBanner ? initialBanner._id || initialBanner.id || "" : "";
  const editBaselineImage = isEditMode && initialBanner ? initialBanner.image || "" : "";
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(() =>
    isEditMode && initialBanner?.image ? mediaUrl(initialBanner.image) : ""
  );
  const fileInputRef = useRef(null);
  const [cropModal, setCropModal] = useState({
    open: false,
    src: "",
    fileName: "",
    mimeType: "",
  });

  const revokeBlobUrl = (url) => {
    if (url && String(url).startsWith("blob:")) URL.revokeObjectURL(url);
  };

  const closeCropModal = () => {
    setCropModal((prev) => {
      revokeBlobUrl(prev.src);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return { open: false, src: "", fileName: "", mimeType: "" };
    });
  };

  const resetForm = () => {
    revokeBlobUrl(imagePreview);
    setForm(emptyForm());
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImagePick = (e) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setImageFile(null);
      setImagePreview(editBaselineImage ? mediaUrl(editBaselineImage) : "");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setImageFile(null);
      setImagePreview(editBaselineImage ? mediaUrl(editBaselineImage) : "");
      e.target.value = "";
      void Swal.fire({
        icon: "error",
        title: "Invalid file",
        text: "Use JPEG, PNG, GIF, or WebP only.",
      });
      return;
    }

    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      setImageFile(null);
      setImagePreview(editBaselineImage ? mediaUrl(editBaselineImage) : "");
      e.target.value = "";
      void Swal.fire({
        icon: "error",
        title: "Validation error",
        text: `Image must be ${IMAGE_MAX_SIZE_MB} MB or less.`,
      });
      return;
    }

    setCropModal({
      open: true,
      src: URL.createObjectURL(file),
      fileName: file.name,
      mimeType: file.type,
    });
  };

  const handleCropConfirm = (croppedFile) => {
    revokeBlobUrl(imagePreview);
    setImageFile(croppedFile);
    setImagePreview(URL.createObjectURL(croppedFile));
    closeCropModal();
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
      await Swal.fire({
        icon: "error",
        title: "Validation error",
        text: "Banner image is required.",
      });
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
        await adminUpdateBanner(adminToken, editId, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Banner updated", timer: 1500 });
      } else {
        await adminCreateBanner(adminToken, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Banner created", timer: 1500 });
      }
      navigate("/admin/banners");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Save failed",
        text: err.message || "Could not save banner.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={onSubmit}>
        <div className="row g-3">
          <label className="user-field col-12 col-md-6">
            <span
              className="user-field__label"
              style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
            >
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
              onChange={(e) =>
                setForm((p) => ({ ...p, title: sanitizeTitleInput(e.target.value) }))
              }
              maxLength={TITLE_MAX_LEN}
              required
            />
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
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  description: sanitizeDescriptionInput(e.target.value),
                }))
              }
              required
            />
            <small className="data-table__muted">
              {form.description.trim().length}/{DESCRIPTION_MAX_LEN} (min {DESCRIPTION_MIN_LEN})
            </small>
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
          <div className="user-field col-12">
            <span className="user-field__label">
              Banner image ({IMAGE_WIDTH}px × {IMAGE_HEIGHT}px, max {IMAGE_MAX_SIZE_MB} MB){" "}
              {editId ? "(optional)" : <span className="required-dot">*</span>}
            </span>
            <p className="data-table__muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Recommended resolution: <strong>{IMAGE_WIDTH} × {IMAGE_HEIGHT}px</strong> (widescreen).
              Use the crop tool so the image fills the website hero without stretching or black bars.
              Keep important content in the center — edges may crop slightly on smaller screens.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="user-field__input"
              onChange={handleImagePick}
            />
          </div>
        </div>

        {imagePreview ? (
          <div className="banner-image-preview" style={{ marginTop: 16 }}>
            <p className="data-table__muted" style={{ marginBottom: 8, fontSize: 13 }}>
              Preview ({IMAGE_WIDTH} × {IMAGE_HEIGHT}px website crop)
            </p>
            <div
              className="banner-image-preview__frame"
              style={{
                width: "100%",
                maxWidth: 720,
                aspectRatio: `${IMAGE_WIDTH} / ${IMAGE_HEIGHT}`,
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid var(--admin-border, #e5e7eb)",
                background: "#111",
              }}
            >
              <img
                src={imagePreview}
                alt="Banner preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="user-form__actions">
          {isEditMode ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate("/admin/banners")}
            >
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

      <ImageCropModal
        open={cropModal.open}
        title="Crop banner image"
        imageSrc={cropModal.src}
        outputWidth={IMAGE_WIDTH}
        outputHeight={IMAGE_HEIGHT}
        originalFileName={cropModal.fileName}
        originalMimeType={cropModal.mimeType}
        onCancel={closeCropModal}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}

export function BannerAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create banner"
        subtitle={`Upload a ${IMAGE_WIDTH}×${IMAGE_HEIGHT}px hero banner (max ${IMAGE_MAX_SIZE_MB} MB).`}
        backTo="/admin/banners"
      />
      <div className="page-card">
        <BannerForm mode="create" />
      </div>
    </div>
  );
}
