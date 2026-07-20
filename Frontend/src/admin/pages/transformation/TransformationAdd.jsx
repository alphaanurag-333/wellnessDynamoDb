import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateTransformation, adminUpdateTransformation } from "../../api/adminTransformations.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { ImageCropModal } from "../../components/ImageCropModal.jsx";
import { mediaUrl } from "../../../media.js";
import { blockPhoneNonDigitKeyDown } from "../../../utils/personFieldValidation.js";
import {
  NAME_MAX_LEN,
  NAME_MIN_LEN,
  ACHIEVEMENTS_MAX_LEN,
  ACHIEVEMENTS_MIN_LEN,
  ALLOWED_IMAGE_TYPES,
  DESCRIPTION_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  IMAGE_HEIGHT,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_WIDTH,
  TIME_TAKEN_MAX,
  TIME_TAKEN_MAX_LEN,
  TIME_TAKEN_MIN,
  INCHES_LOST_MAX,
  INCHES_LOST_MAX_LEN,
  INCHES_LOST_MIN,
  ORDER_MIN,
  ORDER_MAX,
  emptyForm,
  sanitizeAchievements,
  sanitizeDescription,
  sanitizeInchesLost,
  sanitizeName,
  sanitizeOrder,
  sanitizeTimeTakenMonths,
  validateForm,
} from "./TransformationShared.js";

export function TransformationForm({ mode = "create", initialTransformation = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialTransformation) return emptyForm();
    return {
      name: initialTransformation.name || "",
      timeTaken: sanitizeTimeTakenMonths(
        initialTransformation.timeTaken != null ? String(initialTransformation.timeTaken) : ""
      ),
      inchesLost: sanitizeInchesLost(
        initialTransformation.inchesLost != null ? String(initialTransformation.inchesLost) : ""
      ),
      order: sanitizeOrder(
        initialTransformation.order != null ? String(initialTransformation.order) : "0"
      ),
      achievements: initialTransformation.achievements || "",
      description: initialTransformation.description || "",
      status: initialTransformation.status || "active",
    };
  });
  const editId = isEditMode && initialTransformation ? initialTransformation._id || initialTransformation.id || "" : "";
  const editBaselineOld = isEditMode && initialTransformation ? initialTransformation.oldImage || "" : "";
  const editBaselineNew = isEditMode && initialTransformation ? initialTransformation.newImage || "" : "";
  const [oldFile, setOldFile] = useState(null);
  const [newFile, setNewFile] = useState(null);
  const [oldPreview, setOldPreview] = useState(() =>
    isEditMode && initialTransformation?.oldImage ? mediaUrl(initialTransformation.oldImage) : ""
  );
  const [newPreview, setNewPreview] = useState(() =>
    isEditMode && initialTransformation?.newImage ? mediaUrl(initialTransformation.newImage) : ""
  );
  const oldInputRef = useRef(null);
  const newInputRef = useRef(null);
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
      const inputRef = prev.which === "old" ? oldInputRef : newInputRef;
      if (inputRef?.current) inputRef.current.value = "";
      return { open: false, which: null, src: "", fileName: "", mimeType: "" };
    });
  };

  const resetForm = () => {
    setForm(emptyForm());
    setOldFile(null);
    setNewFile(null);
    setOldPreview("");
    setNewPreview("");
    if (oldInputRef.current) oldInputRef.current.value = "";
    if (newInputRef.current) newInputRef.current.value = "";
  };

  const handleImagePick = (which, e) => {
    const file = e.target.files?.[0] || null;
    const setFile = which === "old" ? setOldFile : setNewFile;
    const setPreview = which === "old" ? setOldPreview : setNewPreview;
    const baseline = which === "old" ? editBaselineOld : editBaselineNew;

    if (file) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setFile(null);
        setPreview(baseline ? mediaUrl(baseline) : "");
        e.target.value = "";
        void Swal.fire({ icon: "error", title: "Invalid file", text: "Use JPEG, PNG, GIF, or WebP only." });
        return;
      }
      if (file.size > IMAGE_MAX_SIZE_BYTES) {
        setFile(null);
        setPreview(baseline ? mediaUrl(baseline) : "");
        e.target.value = "";
        void Swal.fire({ icon: "error", title: "Validation error", text: "Image must be 25 MB or less." });
        return;
      }

      setCropModal({
        open: true,
        which,
        src: URL.createObjectURL(file),
        fileName: file.name,
        mimeType: file.type,
      });
      return;
    }

    setFile(null);
    setPreview(baseline ? mediaUrl(baseline) : "");
  };

  const handleCropConfirm = (croppedFile) => {
    const which = cropModal.which;
    if (!which) {
      closeCropModal();
      return;
    }

    const setFile = which === "old" ? setOldFile : setNewFile;
    const setPreview = which === "old" ? setOldPreview : setNewPreview;
    const currentPreview = which === "old" ? oldPreview : newPreview;

    revokeBlobUrl(currentPreview);
    setFile(croppedFile);
    setPreview(URL.createObjectURL(croppedFile));
    closeCropModal();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const hasExistingImages = Boolean(
      editId && editBaselineOld && String(editBaselineOld).trim() && editBaselineNew && String(editBaselineNew).trim()
    );

    const validationError = validateForm(form, {
      editId,
      oldFile,
      newFile,
      hasExistingImages,
    });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    const payload = {
      name: form.name.trim(),
      timeTaken: Number(form.timeTaken),
      inchesLost: Number(form.inchesLost),
      order: Number(form.order),
      achievements: form.achievements.trim(),
      description: form.description.trim(),
      status: form.status || "active",
    };

    setSaving(true);
    try {
      if (editId) {
        const hasAnyFile = oldFile instanceof File || newFile instanceof File;
        if (hasAnyFile) {
          await adminUpdateTransformation(adminToken, editId, payload, oldFile, newFile);
        } else {
          await adminUpdateTransformation(adminToken, editId, payload, null, null);
        }
        await Swal.fire({ icon: "success", title: "Transformation updated", timer: 1500 });
      } else {
        await adminCreateTransformation(adminToken, payload, oldFile, newFile);
        await Swal.fire({ icon: "success", title: "Transformation created", timer: 1500 });
      }
      navigate("/admin/transformations");
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
            Time taken (in months) <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.timeTaken}
            onChange={(e) =>
              setForm((p) => ({ ...p, timeTaken: sanitizeTimeTakenMonths(e.target.value) }))
            }
            onKeyDown={blockPhoneNonDigitKeyDown}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={TIME_TAKEN_MAX_LEN}
            placeholder={`${TIME_TAKEN_MIN} to ${TIME_TAKEN_MAX}`}
            required
          />
          <small className="data-table__muted">
            Whole months only ({TIME_TAKEN_MIN}–{TIME_TAKEN_MAX}).
          </small>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Inches lost <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.inchesLost}
            onChange={(e) =>
              setForm((p) => ({ ...p, inchesLost: sanitizeInchesLost(e.target.value) }))
            }
            inputMode="decimal"
            maxLength={INCHES_LOST_MAX_LEN}
            placeholder={`${INCHES_LOST_MIN} to ${INCHES_LOST_MAX}`}
            required
          />
          <small className="data-table__muted">
            One decimal allowed ({INCHES_LOST_MIN}–{INCHES_LOST_MAX}).
          </small>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Order <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.order}
            onChange={(e) => setForm((p) => ({ ...p, order: sanitizeOrder(e.target.value) }))}
            onKeyDown={blockPhoneNonDigitKeyDown}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={`${ORDER_MIN} to ${ORDER_MAX}`}
            required
          />
          <small className="data-table__muted">
            Lower number shows first ({ORDER_MIN}–{ORDER_MAX}).
          </small>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Name <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.name}
            minLength={NAME_MIN_LEN}
            maxLength={NAME_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, name: sanitizeName(e.target.value) }))}
            placeholder="Person's name"
            required
          />
          <small className="data-table__muted">
            {form.name.trim().length}/{NAME_MAX_LEN} (min {NAME_MIN_LEN})
          </small>
        </label>
        <label className="user-field col-12">
          <span className="user-field__label">
            Achievements <span className="required-dot">*</span>
          </span>
          <textarea
            className="user-field__input"
            rows={3}
            value={form.achievements}
            minLength={ACHIEVEMENTS_MIN_LEN}
            maxLength={ACHIEVEMENTS_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, achievements: sanitizeAchievements(e.target.value) }))}
            required
          />
          <small className="data-table__muted">
            {form.achievements.trim().length}/{ACHIEVEMENTS_MAX_LEN} (min {ACHIEVEMENTS_MIN_LEN})
          </small>
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
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Before image (width {IMAGE_WIDTH}px × height {IMAGE_HEIGHT}px, max 25 MB){" "}
            {!editId ? <span className="required-dot">*</span> : "(optional — replace current)"}
          </span>
          <input
            ref={oldInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            className="user-field__input"
            onChange={(e) => handleImagePick("old", e)}
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            After image (width {IMAGE_WIDTH}px × height {IMAGE_HEIGHT}px, max 25 MB){" "}
            {!editId ? <span className="required-dot">*</span> : "(optional — replace current)"}
          </span>
          <input
            ref={newInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            className="user-field__input"
            onChange={(e) => handleImagePick("new", e)}
          />
        </label>
      </div>
      {(oldPreview || newPreview) ? (
        <div className="row g-2" style={{ marginTop: 8 }}>
          {oldPreview ? (
            <div className="col-6 col-md-3">
              <div className="data-table__muted" style={{ marginBottom: 4 }}>
                Before
              </div>
              <AdminMediaImage
                path={editBaselineOld}
                src={oldPreview || undefined}
                width={IMAGE_WIDTH}
                height={IMAGE_HEIGHT}
                radius={8}
                alt="Before"
                objectFit="cover"
                className="admin-media-thumb--transformation"
                style={{ width: IMAGE_WIDTH, maxWidth: "100%", height: IMAGE_HEIGHT, background: "#f1f3f5" }}
              />
            </div>
          ) : null}
          {newPreview ? (
            <div className="col-6 col-md-3">
              <div className="data-table__muted" style={{ marginBottom: 4 }}>
                After
              </div>
              <AdminMediaImage
                path={editBaselineNew}
                src={newPreview || undefined}
                width={IMAGE_WIDTH}
                height={IMAGE_HEIGHT}
                radius={8}
                alt="After"
                objectFit="cover"
                className="admin-media-thumb--transformation"
                style={{ width: IMAGE_WIDTH, maxWidth: "100%", height: IMAGE_HEIGHT, background: "#f1f3f5" }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <ImageCropModal
        key={cropModal.src || "closed"}
        open={cropModal.open}
        title={cropModal.which === "old" ? "Crop before image" : cropModal.which === "new" ? "Crop after image" : "Crop image"}
        imageSrc={cropModal.src}
        outputWidth={IMAGE_WIDTH}
        outputHeight={IMAGE_HEIGHT}
        originalFileName={cropModal.fileName}
        originalMimeType={cropModal.mimeType}
        onCancel={closeCropModal}
        onConfirm={handleCropConfirm}
      />
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/transformations")}>
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

export function TransformationAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create transformation"
        subtitle="Add a new before-and-after transformation."
        backTo="/admin/transformations"
      />
      <div className="page-card">
        <TransformationForm mode="create" />
      </div>
    </div>
  );
}
