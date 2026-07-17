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
  MOBILE_IMAGE_HEIGHT,
  MOBILE_IMAGE_WIDTH,
  TITLE_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  DESCRIPTION_MAX_LEN,
  BANNER_TYPE_OPTIONS,
  BANNER_TYPE_MAIN,
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
      bannerType: initialBanner.bannerType || BANNER_TYPE_MAIN,
    };
  });
  const editId = isEditMode && initialBanner ? initialBanner._id || initialBanner.id || "" : "";
  const editBaselineImage = isEditMode && initialBanner ? initialBanner.image || "" : "";
  const editBaselineMobileImage =
    isEditMode && initialBanner ? initialBanner.mobileImage || "" : "";
  const [imageFile, setImageFile] = useState(null);
  const [mobileImageFile, setMobileImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(() =>
    isEditMode && initialBanner?.image ? mediaUrl(initialBanner.image) : ""
  );
  const [mobileImagePreview, setMobileImagePreview] = useState(() =>
    isEditMode && initialBanner?.mobileImage ? mediaUrl(initialBanner.mobileImage) : ""
  );
  const fileInputRef = useRef(null);
  const mobileFileInputRef = useRef(null);
  const [cropModal, setCropModal] = useState({
    open: false,
    which: null,
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
      const inputRef = prev.which === "mobile" ? mobileFileInputRef : fileInputRef;
      if (inputRef?.current) inputRef.current.value = "";
      return { open: false, which: null, src: "", fileName: "", mimeType: "" };
    });
  };

  const resetForm = () => {
    revokeBlobUrl(imagePreview);
    revokeBlobUrl(mobileImagePreview);
    setForm(emptyForm());
    setImageFile(null);
    setMobileImageFile(null);
    setImagePreview("");
    setMobileImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (mobileFileInputRef.current) mobileFileInputRef.current.value = "";
  };

  const handleImagePick = (which, e) => {
    const file = e.target.files?.[0] || null;
    const isMobile = which === "mobile";
    const setFile = isMobile ? setMobileImageFile : setImageFile;
    const setPreview = isMobile ? setMobileImagePreview : setImagePreview;
    const baseline = isMobile ? editBaselineMobileImage : editBaselineImage;

    if (!file) {
      setFile(null);
      setPreview(baseline ? mediaUrl(baseline) : "");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setFile(null);
      setPreview(baseline ? mediaUrl(baseline) : "");
      e.target.value = "";
      void Swal.fire({
        icon: "error",
        title: "Invalid file",
        text: "Use JPEG, PNG, GIF, or WebP only.",
      });
      return;
    }

    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      setFile(null);
      setPreview(baseline ? mediaUrl(baseline) : "");
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
      which,
      src: URL.createObjectURL(file),
      fileName: file.name,
      mimeType: file.type,
    });
  };

  const handleCropConfirm = (croppedFile) => {
    const which = cropModal.which;
    if (!which) {
      closeCropModal();
      return;
    }
    const isMobile = which === "mobile";
    const currentPreview = isMobile ? mobileImagePreview : imagePreview;
    revokeBlobUrl(currentPreview);
    if (isMobile) {
      setMobileImageFile(croppedFile);
      setMobileImagePreview(URL.createObjectURL(croppedFile));
    } else {
      setImageFile(croppedFile);
      setImagePreview(URL.createObjectURL(croppedFile));
    }
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
        text: "Desktop banner image is required.",
      });
      return;
    }
    if (!editId && !(mobileImageFile instanceof File)) {
      await Swal.fire({
        icon: "error",
        title: "Validation error",
        text: "Mobile banner image is required.",
      });
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status || "active",
      bannerType: form.bannerType || BANNER_TYPE_MAIN,
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateBanner(adminToken, editId, payload, imageFile, mobileImageFile);
        await Swal.fire({ icon: "success", title: "Banner updated", timer: 1500 });
      } else {
        await adminCreateBanner(adminToken, payload, imageFile, mobileImageFile);
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

  const cropIsMobile = cropModal.which === "mobile";
  const cropWidth = cropIsMobile ? MOBILE_IMAGE_WIDTH : IMAGE_WIDTH;
  const cropHeight = cropIsMobile ? MOBILE_IMAGE_HEIGHT : IMAGE_HEIGHT;

  return (
    <>
      <form onSubmit={onSubmit}>
        <div className="row g-3">
          <label className="user-field col-12 col-md-6">
            <span className="user-field__label">
              Banner type <span className="required-dot">*</span>
            </span>
            <select
              className="user-field__input"
              value={form.bannerType}
              onChange={(e) => setForm((p) => ({ ...p, bannerType: e.target.value }))}
              required
            >
              {BANNER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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

          <div className="user-field col-12 col-md-6">
            <span className="user-field__label">
              Desktop banner image ({IMAGE_WIDTH}px × {IMAGE_HEIGHT}px, max {IMAGE_MAX_SIZE_MB} MB){" "}
              {editId ? "(optional)" : <span className="required-dot">*</span>}
            </span>
            <p className="data-table__muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Recommended: <strong>{IMAGE_WIDTH} × {IMAGE_HEIGHT}px</strong> for the website desktop
              hero. Keep important content in the center.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="user-field__input"
              onChange={(e) => handleImagePick("desktop", e)}
            />
            {imagePreview ? (
              <div className="banner-image-preview" style={{ marginTop: 12 }}>
                <p className="data-table__muted" style={{ marginBottom: 8, fontSize: 13 }}>
                  Desktop preview ({IMAGE_WIDTH} × {IMAGE_HEIGHT}px)
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
                    alt="Desktop banner preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="user-field col-12 col-md-6">
            <span className="user-field__label">
              Mobile banner image ({MOBILE_IMAGE_WIDTH}px × {MOBILE_IMAGE_HEIGHT}px, max{" "}
              {IMAGE_MAX_SIZE_MB} MB){" "}
              {editId ? "(optional)" : <span className="required-dot">*</span>}
            </span>
            <p className="data-table__muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Recommended: <strong>
                {MOBILE_IMAGE_WIDTH} × {MOBILE_IMAGE_HEIGHT}px
              </strong>{" "}
              for mobile website and the app home banner. Use a tighter crop so faces/text stay
              readable on smaller screens.
            </p>
            <input
              ref={mobileFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="user-field__input"
              onChange={(e) => handleImagePick("mobile", e)}
            />
            {mobileImagePreview ? (
              <div className="banner-image-preview" style={{ marginTop: 12 }}>
                <p className="data-table__muted" style={{ marginBottom: 8, fontSize: 13 }}>
                  Mobile / app preview ({MOBILE_IMAGE_WIDTH} × {MOBILE_IMAGE_HEIGHT}px)
                </p>
                <div
                  className="banner-image-preview__frame"
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    aspectRatio: `${MOBILE_IMAGE_WIDTH} / ${MOBILE_IMAGE_HEIGHT}`,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid var(--admin-border, #e5e7eb)",
                    background: "#111",
                  }}
                >
                  <img
                    src={mobileImagePreview}
                    alt="Mobile banner preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

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
        title={cropIsMobile ? "Crop mobile banner image" : "Crop desktop banner image"}
        imageSrc={cropModal.src}
        outputWidth={cropWidth}
        outputHeight={cropHeight}
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
        subtitle={`Upload desktop (${IMAGE_WIDTH}×${IMAGE_HEIGHT}px) and mobile (${MOBILE_IMAGE_WIDTH}×${MOBILE_IMAGE_HEIGHT}px) banners (max ${IMAGE_MAX_SIZE_MB} MB each).`}
        backTo="/admin/banners"
      />
      <div className="page-card">
        <BannerForm mode="create" />
      </div>
    </div>
  );
}
