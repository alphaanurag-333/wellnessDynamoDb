import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreatePhysicalExercise, adminUpdatePhysicalExercise } from "../../api/adminPhysicalExercise.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";
import {
  ALLOWED_VIDEO_TYPES,
  DESCRIPTION_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  LINK_MAX_LEN,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
  emptyForm,
  sanitizeDescription,
  sanitizeTitle,
  validateForm,
  validateVideoFileSize,
} from "./PhysicalExerciseShared.js";

export function PhysicalExerciseForm({ mode = "create", initialExercise = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialExercise) return emptyForm();
    return {
      title: initialExercise.title || "",
      description: initialExercise.description || "",
      type: initialExercise.type || "ytlink",
      link: initialExercise.type === "video" ? "" : initialExercise.link || "",
      status: initialExercise.status || "active",
    };
  });
  const editId = isEditMode && initialExercise ? initialExercise._id || initialExercise.id || "" : "";
  const editBaselineVideo = isEditMode && initialExercise?.type === "video" ? initialExercise.link || "" : "";
  const [videoFile, setVideoFile] = useState(null);
  const [videoName, setVideoName] = useState(() =>
    editBaselineVideo ? String(editBaselineVideo).split("/").pop() : ""
  );
  const [videoPreview, setVideoPreview] = useState(() => (editBaselineVideo ? mediaUrl(editBaselineVideo) : ""));
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
    setVideoFile(null);
    setVideoName("");
    revokeVideoPreviewBlob();
    setVideoPreview("");
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const onTypeChange = (nextType) => {
    setForm((p) => (nextType === "video" ? { ...p, type: "video", link: "" } : { ...p, type: "ytlink" }));
    if (nextType === "ytlink") {
      setVideoFile(null);
      revokeVideoPreviewBlob();
      setVideoPreview("");
      setVideoName("");
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
      videoFile,
      hasExistingVideo: Boolean(editBaselineVideo && String(editBaselineVideo).trim()),
    });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }
    const isVideo = form.type === "video";
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type || "ytlink",
      status: form.status || "active",
    };
    if (!isVideo) {
      payload.link = form.link.trim();
    } else if (!editId) {
      payload.link = "";
    }
    setSaving(true);
    try {
      const files = { videoFile: isVideo ? videoFile : null };
      if (editId) {
        await adminUpdatePhysicalExercise(adminToken, editId, payload, files);
        await Swal.fire({ icon: "success", title: "Physical exercise updated", timer: 1500 });
      } else {
        await adminCreatePhysicalExercise(adminToken, payload, files);
        await Swal.fire({ icon: "success", title: "Physical exercise created", timer: 1500 });
      }
      navigate("/admin/physical-exercises");
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
          <select
            className="user-field__input"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
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
        {form.type === "ytlink" ? (
          <label className="user-field col-12">
            <span className="user-field__label">
              YouTube link <span className="required-dot">*</span>
            </span>
            <input
              className="user-field__input"
              value={form.link}
              onChange={(e) => setForm((p) => ({ ...p, link: e.target.value.slice(0, LINK_MAX_LEN) }))}
              placeholder="https://youtube.com/..."
              required
            />
            <small className="data-table__muted">
              {form.link.length}/{LINK_MAX_LEN}
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
      </div>
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/physical-exercises")}>
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

export function PhysicalExerciseAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create physical exercise"
        subtitle="Add a new physical exercise video or YouTube link."
        backTo="/admin/physical-exercises"
      />
      <div className="page-card">
        <PhysicalExerciseForm mode="create" />
      </div>
    </div>
  );
}
