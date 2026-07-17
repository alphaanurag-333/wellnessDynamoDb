import { useEffect, useId, useRef, useState } from "react";
import Swal from "sweetalert2";
import { mediaUrl } from "../../media.js";
import {
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MAX_SIZE_MB,
  validateImageFileSize,
} from "../../utils/mediaUploadValidation.js";
import { AdminMediaImage } from "./AdminMediaImage.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";

export const ALLOWED_ADMIN_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export const ADMIN_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp";

const DEFAULT_ACCEPT = ADMIN_IMAGE_ACCEPT;

function revokeBlobUrl(url) {
  if (url && String(url).startsWith("blob:")) URL.revokeObjectURL(url);
}

/**
 * Consistent admin image field: file select → fixed-size crop → framed preview.
 * variant="field"  — labeled file input (banner-style)
 * variant="avatar" — clickable round photo (user / coach / sub-admin)
 */
export function AdminImagePicker({
  variant = "field",
  label = "Image",
  hint = "",
  chooseLabel = "Choose image",
  required = false,
  optionalLabel = false,
  outputWidth,
  outputHeight,
  previewMaxWidth = 280,
  previewRound = false,
  avatarSize = 112,
  cropTitle = "Crop image",
  accept = DEFAULT_ACCEPT,
  allowedTypes = ALLOWED_ADMIN_IMAGE_TYPES,
  file = null,
  previewUrl = "",
  baselinePath = "",
  onChange,
  disabled = false,
  className = "",
  inputRef: inputRefProp = null,
  alt = "Image preview",
  onClear,
  showClear = false,
}) {
  const autoId = useId();
  const localInputRef = useRef(null);
  const inputRef = inputRefProp || localInputRef;
  const [cropModal, setCropModal] = useState({
    open: false,
    src: "",
    fileName: "",
    mimeType: "",
  });

  const baselineUrl = baselinePath ? mediaUrl(baselinePath) : "";
  const displayPreview = previewUrl || baselineUrl;
  const isAvatar = variant === "avatar";

  useEffect(() => {
    return () => {
      revokeBlobUrl(cropModal.src);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only revoke on unmount
  }, []);

  const closeCropModal = () => {
    setCropModal((prev) => {
      revokeBlobUrl(prev.src);
      if (inputRef.current) inputRef.current.value = "";
      return { open: false, src: "", fileName: "", mimeType: "" };
    });
  };

  const emit = (nextFile, nextPreview) => {
    onChange?.({ file: nextFile, previewUrl: nextPreview });
  };

  const handlePick = (e) => {
    const picked = e.target.files?.[0] || null;

    if (!picked) {
      revokeBlobUrl(previewUrl);
      emit(null, baselineUrl || "");
      return;
    }

    if (allowedTypes && !allowedTypes.has(picked.type)) {
      emit(null, baselineUrl || "");
      e.target.value = "";
      void Swal.fire({
        icon: "error",
        title: "Invalid file",
        text: "Use JPEG, PNG, GIF, or WebP only.",
      });
      return;
    }

    const sizeError = validateImageFileSize(picked);
    if (sizeError || picked.size > IMAGE_MAX_SIZE_BYTES) {
      emit(null, baselineUrl || "");
      e.target.value = "";
      void Swal.fire({
        icon: "error",
        title: "Validation error",
        text: sizeError || `Image must be ${IMAGE_MAX_SIZE_MB} MB or less.`,
      });
      return;
    }

    setCropModal({
      open: true,
      src: URL.createObjectURL(picked),
      fileName: picked.name,
      mimeType: picked.type,
    });
  };

  const handleCropConfirm = (croppedFile) => {
    revokeBlobUrl(previewUrl);
    emit(croppedFile, URL.createObjectURL(croppedFile));
    closeCropModal();
  };

  const openPicker = (e) => {
    e?.preventDefault?.();
    if (disabled) return;
    inputRef.current?.click();
  };

  const sizeLabel = `${outputWidth}px × ${outputHeight}px`;

  const cropModalEl = (
    <ImageCropModal
      key={cropModal.src || "closed"}
      open={cropModal.open}
      title={cropTitle}
      imageSrc={cropModal.src}
      outputWidth={outputWidth}
      outputHeight={outputHeight}
      originalFileName={cropModal.fileName}
      originalMimeType={cropModal.mimeType}
      onCancel={closeCropModal}
      onConfirm={handleCropConfirm}
    />
  );

  if (isAvatar) {
    return (
      <div className={`admin-image-picker admin-image-picker--avatar${className ? ` ${className}` : ""}`}>
        <input
          id={autoId}
          ref={inputRef}
          type="file"
          accept={accept}
          className="d-none"
          onChange={handlePick}
          disabled={disabled}
        />
        <div className="d-flex flex-column flex-sm-row align-items-start gap-3 gap-sm-4">
          <button
            type="button"
            className="admin-image-picker__avatar-btn"
            onClick={openPicker}
            disabled={disabled}
            aria-label={chooseLabel}
          >
            <div
              className="admin-image-picker__avatar-circle"
              style={{ width: avatarSize, height: avatarSize }}
            >
              {displayPreview ? (
                <AdminMediaImage
                  path={file ? undefined : baselinePath}
                  src={displayPreview}
                  round
                  width={avatarSize}
                  height={avatarSize}
                  alt={alt}
                />
              ) : (
                <span className="admin-image-picker__avatar-placeholder">Photo</span>
              )}
            </div>
            <span className="admin-image-picker__avatar-choose text-primary">{chooseLabel}</span>
          </button>
          <div className="flex-grow-1 pt-sm-1">
            <div className="fw-semibold mb-1">
              {label}{" "}
              {required ? <span className="required-dot">*</span> : null}
            </div>
            <p className="text-body-secondary small mb-2 mb-sm-3">
              {hint ||
                `Optional. Crop to ${sizeLabel} (max ${IMAGE_MAX_SIZE_MB} MB). JPEG, PNG, GIF, or WebP.`}
            </p>
            {showClear && file instanceof File && onClear ? (
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClear}>
                Remove new image
              </button>
            ) : null}
          </div>
        </div>
        {cropModalEl}
      </div>
    );
  }

  return (
    <div className={`admin-image-picker user-field${className ? ` ${className}` : ""}`}>
      <span className="user-field__label">
        {label} ({sizeLabel}, max {IMAGE_MAX_SIZE_MB} MB){" "}
        {required ? <span className="required-dot">*</span> : null}
        {optionalLabel ? " (optional — leave unchanged to keep current)" : null}
      </span>
      {/* {hint ? (
        <p className="admin-image-picker__hint data-table__muted">{hint}</p>
      ) : (
        <p className="admin-image-picker__hint data-table__muted">
          Recommended: <strong>
            {outputWidth} × {outputHeight}px
          </strong>
          . Crop opens after you choose a file so the upload matches this size.
        </p>
      )} */}
      <input
        id={autoId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="user-field__input"
        onChange={handlePick}
        disabled={disabled}
      />
      {displayPreview ? (
        <div className="admin-image-picker__preview">
          <p className="admin-image-picker__preview-label data-table__muted">
            Preview ({outputWidth} × {outputHeight}px)
            {file instanceof File ? " — new crop ready to save" : ""}
          </p>
          <div
            className={`admin-image-picker__frame${previewRound ? " admin-image-picker__frame--round" : ""}`}
            style={{
              maxWidth: previewMaxWidth,
              aspectRatio: `${outputWidth} / ${outputHeight}`,
            }}
          >
            <img src={displayPreview} alt={alt} />
          </div>
        </div>
      ) : null}
      {cropModalEl}
    </div>
  );
}

/** Common crop presets used across admin forms */
export const ADMIN_IMAGE_PRESETS = {
  profile: { width: 400, height: 400, previewMaxWidth: 160, round: true },
  icon: { width: 200, height: 200, previewMaxWidth: 120, round: false },
  product: { width: 400, height: 400, previewMaxWidth: 180, round: false },
  thumbnail: { width: 640, height: 360, previewMaxWidth: 320, round: false },
  notification: { width: 800, height: 480, previewMaxWidth: 320, round: false },
};
