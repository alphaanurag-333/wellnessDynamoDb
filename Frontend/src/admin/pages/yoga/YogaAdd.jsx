import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateYoga, adminUpdateYoga } from "../../api/adminYoga.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { mediaUrl } from "../../../media.js";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  IMAGE_MAX_SIZE_BYTES,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
  YT_LINK_MAX_LEN,
  emptyForm,
  sanitizeTitle,
  validateForm,
  validateVideoFileSize,
} from "./YogaShared.js";

export function YogaForm({ mode = "create", initialYoga = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialYoga) return emptyForm();
    return {
      title: initialYoga.title || "",
      type: initialYoga.type || "ytlink",
      ytLink: initialYoga.ytLink || "",
      video: initialYoga.video || "",
      status: initialYoga.status || "active",
    };
  });
  const editId = isEditMode && initialYoga ? initialYoga._id || initialYoga.id || "" : "";
  const editBaselineThumbnail = isEditMode && initialYoga ? initialYoga.thumbnail || "" : "";
  const editBaselineVideo = isEditMode && initialYoga ? initialYoga.video || "" : "";
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(() =>
    isEditMode && initialYoga?.thumbnail ? mediaUrl(initialYoga.thumbnail) : ""
  );
  const [videoFile, setVideoFile] = useState(null);
  const [videoName, setVideoName] = useState(() =>
    isEditMode && initialYoga?.video ? String(initialYoga.video).split("/").pop() : ""
  );
  const [videoPreview, setVideoPreview] = useState(() => {
    if (isEditMode && initialYoga?.type === "video" && initialYoga?.video) {
      return mediaUrl(initialYoga.video);
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
      title: form.title.trim(),
      type: form.type || "ytlink",
      ytLink: form.type === "ytlink" ? form.ytLink.trim() : "",
      video: form.type === "video" ? form.video.trim() : "",
      status: form.status || "active",
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateYoga(adminToken, editId, payload, {
          thumbnailFile,
          videoFile: form.type === "video" ? videoFile : null,
        });
        await Swal.fire({ icon: "success", title: "Yoga updated", timer: 1500 });
      } else {
        await adminCreateYoga(adminToken, payload, {
          thumbnailFile,
          videoFile: form.type === "video" ? videoFile : null,
        });
        await Swal.fire({ icon: "success", title: "Yoga created", timer: 1500 });
      }
      navigate("/admin/yoga");
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
        <label className="user-field col-12 col-md-3">
          <span className="user-field__label">Type</span>
          <select className="user-field__input" value={form.type} onChange={(e) => onTypeChange(e.target.value)}>
            <option value="ytlink">YT Link</option>
            <option value="video">Video</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-3">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
                {editId ? "(optional — leave unchanged to keep current)" : <span className="required-dot">*</span>}
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
        <label className="user-field col-12">
          <span className="user-field__label">
            Thumbnail image (upto 25 MB){" "}
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
                  void Swal.fire({ icon: "error", title: "Validation error", text: "Image must be 25 MB or less." });
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
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/yoga")}>
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

export function YogaAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create yoga"
        subtitle="Add a new yoga video or YouTube link."
        backTo="/admin/yoga"
      />
      <div className="page-card">
        <YogaForm mode="create" />
      </div>
    </div>
  );
}
