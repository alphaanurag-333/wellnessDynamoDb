import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateTransformation, adminUpdateTransformation } from "../../api/adminTransformations.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { mediaUrl } from "../../../media.js";
import { blockPhoneNonDigitKeyDown } from "../../../utils/personFieldValidation.js";
import {
  ACHIEVEMENTS_MAX_LEN,
  ACHIEVEMENTS_MIN_LEN,
  ALLOWED_IMAGE_TYPES,
  DESCRIPTION_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  IMAGE_MAX_SIZE_BYTES,
  TIME_TAKEN_MAX,
  TIME_TAKEN_MAX_LEN,
  TIME_TAKEN_MIN,
  emptyForm,
  sanitizeAchievements,
  sanitizeDescription,
  sanitizeTimeTakenMonths,
  userIdFromRow,
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
      timeTaken: sanitizeTimeTakenMonths(
        initialTransformation.timeTaken != null ? String(initialTransformation.timeTaken) : ""
      ),
      achievements: initialTransformation.achievements || "",
      description: initialTransformation.description || "",
      status: initialTransformation.status || "active",
      userId: userIdFromRow(initialTransformation),
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
        void Swal.fire({ icon: "error", title: "Validation error", text: "Image must be 5 MB or less." });
        return;
      }
    }
    setFile(file);
    setPreview(file ? URL.createObjectURL(file) : baseline ? mediaUrl(baseline) : "");
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
      timeTaken: Number(form.timeTaken),
      achievements: form.achievements.trim(),
      description: form.description.trim(),
      status: form.status || "active",
      userId: form.userId.trim(),
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
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        {/* <label className="user-field col-12 col-md-4">
          <span className="user-field__label">User ID (optional)</span>
          <input
            className="user-field__input"
            value={form.userId}
            onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value.trim() }))}
            placeholder="Link to a user record"
            autoComplete="off"
          />
        </label> */}
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
            Before image (max 5 MB){" "}
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
            After image (max 5 MB) {!editId ? <span className="required-dot">*</span> : "(optional — replace current)"}
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
                width={280}
                height={180}
                radius={8}
                alt="Before"
                objectFit="contain"
                style={{ width: "100%", height: 180, background: "#f1f3f5" }}
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
                width={280}
                height={180}
                radius={8}
                alt="After"
                objectFit="contain"
                style={{ width: "100%", height: 180, background: "#f1f3f5" }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
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
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create transformation</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/transformations")}>
            Back to list
          </button>
        </div>
        <TransformationForm mode="create" />
      </div>
    </div>
  );
}
