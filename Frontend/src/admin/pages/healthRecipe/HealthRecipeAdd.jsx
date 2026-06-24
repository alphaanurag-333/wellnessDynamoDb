import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateHealthRecipe, adminUpdateHealthRecipe } from "../../api/adminHealthRecipes.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { mediaUrl } from "../../../media.js";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  DESCRIPTION_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  IMAGE_MAX_SIZE_BYTES,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
  MAX_VIDEO_SPEC_ROWS,
  VIDEO_SPEC_ITEM_MAX_LEN,
  YT_LINK_MAX_LEN,
  emptyForm,
  sanitizeDescription,
  sanitizeTitle,
  sanitizeVideoSpecItem,
  useHealthConcerns,
  validateForm,
  validateVideoFileSize,
  videoSpecsFromApi,
  videoSpecsToPayload,
} from "./HealthRecipeShared.js";

function VideoSpecificationRows({ rows, onChange }) {
  const filledCount = videoSpecsToPayload(rows).length;

  const updateRow = (index, value) => {
    const next = [...rows];
    next[index] = sanitizeVideoSpecItem(value);
    onChange(next);
  };

  const addRow = () => {
    if (rows.length >= MAX_VIDEO_SPEC_ROWS) return;
    onChange([...rows, ""]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="user-field col-12">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <span className="user-field__label" style={{ marginBottom: 0 }}>
          Video specifications
        </span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={addRow} disabled={rows.length >= MAX_VIDEO_SPEC_ROWS}>
          + Add row
        </button>
      </div>
      <small className="data-table__muted" style={{ display: "block", marginBottom: 10 }}>
        {filledCount} item{filledCount === 1 ? "" : "s"} · max {MAX_VIDEO_SPEC_ROWS} rows · {VIDEO_SPEC_ITEM_MAX_LEN} chars per row
      </small>
      <div className="video-spec-rows" style={{ display: "grid", gap: 8 }}>
        {rows.map((row, index) => (
          <div
            key={index}
            className="video-spec-row"
            style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 8, alignItems: "center" }}
          >
            <span className="data-table__muted" style={{ textAlign: "center", fontSize: 13 }}>
              {index + 1}
            </span>
            <input
              type="text"
              className="user-field__input"
              value={row}
              maxLength={VIDEO_SPEC_ITEM_MAX_LEN}
              placeholder="e.g. 18 gm protein"
              onChange={(e) => updateRow(index, e.target.value)}
            />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => removeRow(index)}
              aria-label={`Remove specification row ${index + 1}`}
              title="Remove row"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HealthRecipeForm({ mode = "create", initialRecipe = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const healthConcerns = useHealthConcerns(adminToken, dispatch);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialRecipe) return emptyForm();
    return {
      healthConcernId: initialRecipe.healthConcernId || "",
      title: initialRecipe.title || "",
      description: initialRecipe.description || "",
      type: initialRecipe.type || "ytlink",
      ytLink: initialRecipe.ytLink || "",
      video: initialRecipe.video || "",
      videoSpecs: videoSpecsFromApi(initialRecipe.videoSpecification),
      status: initialRecipe.status || "active",
    };
  });
  const editId = isEditMode && initialRecipe ? initialRecipe._id || initialRecipe.id || "" : "";
  const editBaselineThumbnail = isEditMode && initialRecipe ? initialRecipe.thumbnail || "" : "";
  const editBaselineVideo = isEditMode && initialRecipe ? initialRecipe.video || "" : "";
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(() =>
    isEditMode && initialRecipe?.thumbnail ? mediaUrl(initialRecipe.thumbnail) : ""
  );
  const [videoFile, setVideoFile] = useState(null);
  const [videoName, setVideoName] = useState(() =>
    isEditMode && initialRecipe?.video ? String(initialRecipe.video).split("/").pop() : ""
  );
  const [videoPreview, setVideoPreview] = useState(() => {
    if (isEditMode && initialRecipe?.type === "video" && initialRecipe?.video) {
      return mediaUrl(initialRecipe.video);
    }
    return "";
  });
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const videoPreviewBlobRef = useRef("");

  const revokeVideoPreviewBlob = () => {
    if (videoPreviewBlobRef.current) {
      URL.revokeObjectURL(videoPreviewBlobRef.current);
      videoPreviewBlobRef.current = "";
    }
  };

  useEffect(() => () => revokeVideoPreviewBlob(), []);

  const resetForm = () => {
    setForm(emptyForm());
    setThumbnailFile(null);
    setThumbnailPreview("");
    setVideoFile(null);
    setVideoName("");
    revokeVideoPreviewBlob();
    setVideoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const onTypeChange = (nextType) => {
    setForm((p) => (nextType === "ytlink" ? { ...p, type: "ytlink", video: "" } : { ...p, type: "video", ytLink: "" }));
    if (nextType === "ytlink") {
      setVideoFile(null);
      setVideoName("");
      revokeVideoPreviewBlob();
      setVideoPreview("");
      if (videoInputRef.current) videoInputRef.current.value = "";
    } else {
      setVideoFile(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
      setVideoName(editBaselineVideo ? String(editBaselineVideo).split("/").pop() : "");
      setVideoPreview(editBaselineVideo ? mediaUrl(editBaselineVideo) : "");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;
    const validationError = validateForm(form, {
      editId,
      thumbnailFile,
      hasExistingThumbnail: Boolean(editBaselineThumbnail && String(editBaselineThumbnail).trim()),
      videoFile,
      hasExistingVideo: Boolean(editBaselineVideo && String(editBaselineVideo).trim()),
    });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }
    const payload = {
      healthConcernId: form.healthConcernId.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type || "ytlink",
      ytLink: form.type === "ytlink" ? form.ytLink.trim() : "",
      video: form.type === "video" ? form.video.trim() : "",
      videoSpecification: videoSpecsToPayload(form.videoSpecs),
      status: form.status || "active",
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateHealthRecipe(adminToken, editId, payload, {
          thumbnailFile,
          videoFile: form.type === "video" ? videoFile : null,
        });
        await Swal.fire({ icon: "success", title: "Health recipe updated", timer: 1500 });
      } else {
        await adminCreateHealthRecipe(adminToken, payload, {
          thumbnailFile,
          videoFile: form.type === "video" ? videoFile : null,
        });
        await Swal.fire({ icon: "success", title: "Health recipe created", timer: 1500 });
      }
      navigate("/admin/health-recipes");
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
            Health concern <span className="required-dot">*</span>
          </span>
          <select
            className="user-field__input"
            value={form.healthConcernId}
            onChange={(e) => setForm((p) => ({ ...p, healthConcernId: e.target.value }))}
            required
          >
            <option value="">Select concern</option>
            {healthConcerns.map((c) => (
              <option key={c.id || c._id} value={c.id || c._id}>
                {c.title || c.id || c._id}
              </option>
            ))}
          </select>
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
          <span className="user-field__label">Type</span>
          <select className="user-field__input" value={form.type} onChange={(e) => onTypeChange(e.target.value)}>
            <option value="ytlink">YT Link</option>
            <option value="video">Video</option>
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
        {form.type === "ytlink" ? (
          <label className="user-field col-12">
            <span className="user-field__label">
              YT Link <span className="required-dot">*</span>
            </span>
            <input
              className="user-field__input"
              value={form.ytLink}
              onChange={(e) => setForm((p) => ({ ...p, ytLink: e.target.value.slice(0, YT_LINK_MAX_LEN) }))}
              placeholder="https://youtube.com/..."
              required
            />
            <small className="data-table__muted">
              {form.ytLink.length}/{YT_LINK_MAX_LEN}
            </small>
          </label>
        ) : (
          <div className="col-12">
            <label className="user-field">
              <span className="user-field__label">
                Video file (up to 25 MB){" "}
                {editId ? (
                  "(optional — leave unchanged to keep current)"
                ) : (
                  <span className="required-dot">*</span>
                )}
              </span>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,.mp4,.webm,.ogg,.mov,.m4v"
                className="user-field__input"
                required={!editBaselineVideo && !videoFile}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && !ALLOWED_VIDEO_TYPES.has(file.type)) {
                    setVideoFile(null);
                    setVideoName(editBaselineVideo ? String(editBaselineVideo).split("/").pop() : "");
                    revokeVideoPreviewBlob();
                    setVideoPreview(editBaselineVideo ? mediaUrl(editBaselineVideo) : "");
                    e.target.value = "";
                    void Swal.fire({ icon: "error", title: "Invalid file", text: "Use MP4, WebM, OGG, MOV, or M4V only." });
                    return;
                  }
                  if (file) {
                    const videoErr = validateVideoFileSize(file);
                    if (videoErr) {
                      setVideoFile(null);
                      setVideoName(editBaselineVideo ? String(editBaselineVideo).split("/").pop() : "");
                      revokeVideoPreviewBlob();
                      setVideoPreview(editBaselineVideo ? mediaUrl(editBaselineVideo) : "");
                      e.target.value = "";
                      void Swal.fire({ icon: "error", title: "Validation error", text: videoErr });
                      return;
                    }
                  }
                  setVideoFile(file);
                  if (file) {
                    revokeVideoPreviewBlob();
                    const url = URL.createObjectURL(file);
                    videoPreviewBlobRef.current = url;
                    setVideoPreview(url);
                    setVideoName(file.name);
                  } else {
                    revokeVideoPreviewBlob();
                    setVideoPreview(editBaselineVideo ? mediaUrl(editBaselineVideo) : "");
                    setVideoName(editBaselineVideo ? String(editBaselineVideo).split("/").pop() : "");
                  }
                }}
              />
              <small className="data-table__muted">{videoName || "No video selected"}</small>
            </label>
            {videoPreview ? (
              <div style={{ marginTop: 12 }}>
                <video
                  key={videoPreview}
                  src={videoPreview}
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", maxWidth: 480, maxHeight: 270, borderRadius: 8, display: "block" }}
                />
                <small className="data-table__muted" style={{ display: "block", marginTop: 6 }}>
                  {videoFile ? "New video preview" : "Current saved video"}
                </small>
              </div>
            ) : null}
          </div>
        )}
        <VideoSpecificationRows
          rows={form.videoSpecs}
          onChange={(videoSpecs) => setForm((p) => ({ ...p, videoSpecs }))}
        />
        <label className="user-field col-12">
          <span className="user-field__label">
            Thumbnail image (upto 5 MB){" "}
            {editId ? "(optional — leave unchanged to keep current)" : <span className="required-dot">*</span>}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            className="user-field__input"
            required={!editBaselineThumbnail && !thumbnailFile}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file) {
                if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                  setThumbnailFile(null);
                  setThumbnailPreview(editBaselineThumbnail ? mediaUrl(editBaselineThumbnail) : "");
                  e.target.value = "";
                  void Swal.fire({ icon: "error", title: "Invalid file", text: "Use JPEG, PNG, GIF, or WebP only." });
                  return;
                }
                if (file.size > IMAGE_MAX_SIZE_BYTES) {
                  setThumbnailFile(null);
                  setThumbnailPreview(editBaselineThumbnail ? mediaUrl(editBaselineThumbnail) : "");
                  e.target.value = "";
                  void Swal.fire({ icon: "error", title: "Validation error", text: "Image must be 5 MB or less." });
                  return;
                }
              }
              setThumbnailFile(file);
              setThumbnailPreview(
                file ? URL.createObjectURL(file) : editBaselineThumbnail ? mediaUrl(editBaselineThumbnail) : ""
              );
            }}
          />
        </label>
      </div>
      {thumbnailPreview ? (
        <div style={{ marginTop: 10 }}>
          <AdminMediaImage path={editBaselineThumbnail} src={thumbnailPreview || undefined} width={72} height={72} radius={8} alt="" />
        </div>
      ) : null}
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-recipes")}>
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

export function HealthRecipeAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create health recipe</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-recipes")}>
            Back to list
          </button>
        </div>
        <HealthRecipeForm mode="create" />
      </div>
    </div>
  );
}

