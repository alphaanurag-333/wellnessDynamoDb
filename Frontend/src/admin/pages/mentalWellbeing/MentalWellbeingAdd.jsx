import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateMentalWellbeing, adminUpdateMentalWellbeing } from "../../api/adminMentalWellbeing.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";
import {
  MEDIA_MAX_SIZE_BYTES,
  MEDIA_MAX_SIZE_MB,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
  YT_LINK_MAX_LEN,
  emptyForm,
  isAllowedMediaFile,
  sanitizeTitle,
  validateForm,
} from "./MentalWellbeingShared.js";

export function MentalWellbeingForm({ mode = "create", initialItem = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialItem) return emptyForm();
    return {
      title: initialItem.title || "",
      type: initialItem.type || "ytlink",
      ytLink: initialItem.type === "ytlink" ? initialItem.ytLink || "" : "",
      status: initialItem.status || "active",
    };
  });
  const editId = isEditMode && initialItem ? initialItem._id || initialItem.id || "" : "";
  const isFileType = initialItem && (initialItem.type === "video" || initialItem.type === "audio");
  const editBaselineFile = isEditMode && isFileType ? initialItem.file || "" : "";
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaName, setMediaName] = useState(() => (editBaselineFile ? String(editBaselineFile).split("/").pop() : ""));
  const [mediaPreview, setMediaPreview] = useState(() => (editBaselineFile ? mediaUrl(editBaselineFile) : ""));
  const fileInputRef = useRef(null);
  const previewBlobRef = useRef("");

  const revokePreviewBlob = () => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = "";
    }
  };

  useEffect(() => () => revokePreviewBlob(), []);

  const baselineFor = (type) => (isEditMode && initialItem?.type === type ? initialItem.file || "" : "");

  const resetForm = () => {
    setForm(emptyForm());
    setMediaFile(null);
    setMediaName("");
    revokePreviewBlob();
    setMediaPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onTypeChange = (nextType) => {
    setForm((p) => ({ ...p, type: nextType, ytLink: nextType === "ytlink" ? p.ytLink : "" }));
    setMediaFile(null);
    revokePreviewBlob();
    if (fileInputRef.current) fileInputRef.current.value = "";
    const baseline = baselineFor(nextType);
    setMediaName(baseline ? String(baseline).split("/").pop() : "");
    setMediaPreview(baseline ? mediaUrl(baseline) : "");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;
    const validationError = validateForm(form, {
      mediaFile,
      hasExistingFile: Boolean(baselineFor(form.type) && String(baselineFor(form.type)).trim()),
    });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }
    const isFile = form.type === "video" || form.type === "audio";
    const payload = {
      title: form.title.trim(),
      type: form.type || "ytlink",
      status: form.status || "active",
    };
    if (!isFile) {
      payload.ytLink = form.ytLink.trim();
    } else if (!editId) {
      payload.file = "";
    }
    setSaving(true);
    try {
      const uploadFile = isFile ? mediaFile : null;
      if (editId) {
        await adminUpdateMentalWellbeing(adminToken, editId, payload, uploadFile);
        await Swal.fire({ icon: "success", title: "Item updated", timer: 1500 });
      } else {
        await adminCreateMentalWellbeing(adminToken, payload, uploadFile);
        await Swal.fire({ icon: "success", title: "Item created", timer: 1500 });
      }
      navigate("/admin/mental-wellbeing");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  const acceptForType =
    form.type === "audio"
      ? "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/x-m4a,audio/mp4,.mp3,.wav,.ogg,.aac,.m4a"
      : "video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,.mp4,.webm,.ogg,.mov,.m4v";

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
            <option value="audio">Audio</option>
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
              YouTube link <span className="required-dot">*</span>
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
                {form.type === "audio" ? "Audio" : "Video"} file (up to {MEDIA_MAX_SIZE_MB} MB){" "}
                {editId ? "(optional — leave unchanged to keep current)" : <span className="required-dot">*</span>}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptForType}
                className="user-field__input"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  const baseline = baselineFor(form.type);
                  if (file && !isAllowedMediaFile(file, form.type)) {
                    setMediaFile(null);
                    setMediaName(baseline ? String(baseline).split("/").pop() : "");
                    revokePreviewBlob();
                    setMediaPreview(baseline ? mediaUrl(baseline) : "");
                    e.target.value = "";
                    void Swal.fire({
                      icon: "error",
                      title: "Invalid file",
                      text: form.type === "audio" ? "Use MP3, WAV, OGG, AAC, or M4A." : "Use MP4, WebM, OGG, MOV, or M4V.",
                    });
                    return;
                  }
                  if (file && file.size > MEDIA_MAX_SIZE_BYTES) {
                    setMediaFile(null);
                    setMediaName(baseline ? String(baseline).split("/").pop() : "");
                    revokePreviewBlob();
                    setMediaPreview(baseline ? mediaUrl(baseline) : "");
                    e.target.value = "";
                    void Swal.fire({ icon: "error", title: "Validation error", text: `File must be ${MEDIA_MAX_SIZE_MB} MB or smaller.` });
                    return;
                  }
                  setMediaFile(file);
                  if (file) {
                    revokePreviewBlob();
                    const url = URL.createObjectURL(file);
                    previewBlobRef.current = url;
                    setMediaPreview(url);
                    setMediaName(file.name);
                  } else {
                    revokePreviewBlob();
                    setMediaPreview(baseline ? mediaUrl(baseline) : "");
                    setMediaName(baseline ? String(baseline).split("/").pop() : "");
                  }
                }}
              />
              <small className="data-table__muted">{mediaName || "No file selected"}</small>
            </label>
            {mediaPreview ? (
              <div style={{ marginTop: 12 }}>
                {form.type === "audio" ? (
                  <audio key={mediaPreview} src={mediaPreview} controls preload="metadata" style={{ width: "100%", maxWidth: 480, display: "block" }} />
                ) : (
                  <video
                    key={mediaPreview}
                    src={mediaPreview}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ width: "100%", maxWidth: 480, maxHeight: 270, borderRadius: 8, display: "block" }}
                  />
                )}
                <small className="data-table__muted" style={{ display: "block", marginTop: 6 }}>
                  {mediaFile ? "New file preview" : "Current saved file"}
                </small>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/mental-wellbeing")}>
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

export function MentalWellbeingAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create mental wellbeing item"
        subtitle="Add a video, audio, or YouTube link."
        backTo="/admin/mental-wellbeing"
      />
      <div className="page-card">
        <MentalWellbeingForm mode="create" />
      </div>
    </div>
  );
}
