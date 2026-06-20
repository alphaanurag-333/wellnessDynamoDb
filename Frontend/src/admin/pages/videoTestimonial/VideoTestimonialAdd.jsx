import { useEffect, useRef, useState } from "react";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateVideoTestimonial,
  adminUpdateVideoTestimonial,
} from "../../api/videoTestimonialsController.js";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";
import {
  IMAGE_MAX_SIZE_BYTES,
  NAME_MAX_LEN,
  TYPE_OPTIONS,
  VIDEO_MAX_SIZE_BYTES,
  YTLINK_MAX_LEN,
  emptyForm,
  testimonialFromApi,
} from "./VideoTestimonialShared.js";

export function VideoTestimonialForm({ mode = "create", initialTestimonial = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const initial = initialTestimonial ? testimonialFromApi(initialTestimonial) : null;

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => initial || emptyForm());
  const editId =
    isEditMode && initialTestimonial ? initialTestimonial._id || initialTestimonial.id || "" : "";
  const editBaselineVideo = initial?.video || "";
  const editBaselineProfileImage = initial?.profileImage || "";

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(() =>
    editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : ""
  );
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileName, setVideoFileName] = useState(() =>
    editBaselineVideo ? String(editBaselineVideo).split("/").pop() : ""
  );
  const [videoPreview, setVideoPreview] = useState(() =>
    initial?.type === "video" && editBaselineVideo ? mediaUrl(editBaselineVideo) : ""
  );

  const videoFileInputRef = useRef(null);
  const profileFileInputRef = useRef(null);
  const profilePreviewBlobRef = useRef("");
  const videoPreviewBlobRef = useRef("");

  const revokeProfilePreviewBlob = () => {
    if (profilePreviewBlobRef.current) {
      URL.revokeObjectURL(profilePreviewBlobRef.current);
      profilePreviewBlobRef.current = "";
    }
  };

  const revokeVideoPreviewBlob = () => {
    if (videoPreviewBlobRef.current) {
      URL.revokeObjectURL(videoPreviewBlobRef.current);
      videoPreviewBlobRef.current = "";
    }
  };

  useEffect(() => {
    return () => {
      revokeProfilePreviewBlob();
      revokeVideoPreviewBlob();
    };
  }, []);

  useEffect(() => {
    if (!initialTestimonial) return;
    const next = testimonialFromApi(initialTestimonial);
    const savedProfile = next.profileImage || "";
    const savedVideo = next.video || "";
    setForm(next);
    setProfileImageFile(null);
    setVideoFile(null);
    revokeProfilePreviewBlob();
    revokeVideoPreviewBlob();
    setProfilePreview(savedProfile ? mediaUrl(savedProfile) : "");
    setVideoFileName(savedVideo ? String(savedVideo).split("/").pop() : "");
    setVideoPreview(next.type === "video" && savedVideo ? mediaUrl(savedVideo) : "");
    if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    if (profileFileInputRef.current) profileFileInputRef.current.value = "";
  }, [initialTestimonial]);

  const onTypeChange = (nextType) => {
    setForm((p) =>
      nextType === "link" ? { ...p, type: "link", video: "" } : { ...p, type: "video", ytLink: "" }
    );
    if (nextType === "link") {
      setVideoFile(null);
      setVideoFileName("");
      revokeVideoPreviewBlob();
      setVideoPreview("");
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    } else {
      setVideoFile(null);
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
      setVideoFileName(editBaselineVideo ? String(editBaselineVideo).split("/").pop() : "");
      setVideoPreview(editBaselineVideo ? mediaUrl(editBaselineVideo) : "");
    }
  };

  const resetForm = () => {
    setForm(emptyForm());
    setVideoFile(null);
    setVideoFileName("");
    setProfileImageFile(null);
    revokeProfilePreviewBlob();
    revokeVideoPreviewBlob();
    setProfilePreview("");
    setVideoPreview("");
    if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    if (profileFileInputRef.current) profileFileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const payload = {
      name: String(form.name || "").replace(/\s+/g, " ").slice(0, NAME_MAX_LEN).trim(),
      type: String(form.type || "link").trim().toLowerCase(),
      ytLink: String(form.ytLink || "").slice(0, YTLINK_MAX_LEN).trim(),
      status: String(form.status || "active").trim().toLowerCase(),
    };

    if (!payload.name) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Name is required." });
      return;
    }
    if (!editId && !(profileImageFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Profile image upload is required." });
      return;
    }
    if (!TYPE_OPTIONS.includes(payload.type)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Type must be link or video." });
      return;
    }
    if (payload.type === "link" && !payload.ytLink) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "YouTube link is required for link type." });
      return;
    }
    if (payload.type === "video" && !editId && !(videoFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Video file upload is required for video type." });
      return;
    }
    if (payload.type === "video" && editId && !editBaselineVideo && !(videoFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Video file is required for video type." });
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateVideoTestimonial(adminToken, editId, {
          ...payload,
          profileImageFile,
          videoFile,
        });
        await Swal.fire({ icon: "success", title: "Video testimonial updated", timer: 1500 });
      } else {
        await adminCreateVideoTestimonial(adminToken, {
          ...payload,
          profileImageFile,
          videoFile,
        });
        await Swal.fire({ icon: "success", title: "Video testimonial created", timer: 1500 });
      }
      navigate("/admin/video-testimonials");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save video testimonial." });
    } finally {
      setSaving(false);
    }
  };

  const profilePreviewLabel = profileImageFile
    ? "New image preview"
    : editBaselineProfileImage
      ? "Current saved image"
      : "";

  const videoPreviewLabel = videoFile
    ? "New video preview"
    : editBaselineVideo && form.type === "video"
      ? "Current saved video"
      : "";

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Name <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            maxLength={NAME_MAX_LEN}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Type</span>
          <select
            className="user-field__input"
            value={form.type}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="link">Link</option>
            <option value="video">Video</option>
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
          <span className="user-field__label">
            Profile image (up to 5 MB){" "}
            {editId ? "(optional — keep file empty to retain current)" : <span className="required-dot">*</span>}
          </span>
          <input
            ref={profileFileInputRef}
            className="user-field__input"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file && file.size > IMAGE_MAX_SIZE_BYTES) {
                setProfileImageFile(null);
                revokeProfilePreviewBlob();
                setProfilePreview(editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : "");
                e.target.value = "";
                void Swal.fire({
                  icon: "error",
                  title: "Validation error",
                  text: "Profile image must be 5 MB or less.",
                });
                return;
              }
              setProfileImageFile(file);
              if (file) {
                revokeProfilePreviewBlob();
                const url = URL.createObjectURL(file);
                profilePreviewBlobRef.current = url;
                setProfilePreview(url);
              } else {
                revokeProfilePreviewBlob();
                setProfilePreview(editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : "");
              }
            }}
          />
          {profilePreview ? (
            <div style={{ marginTop: 12 }}>
              <AdminMediaImage
                path={profileImageFile ? undefined : editBaselineProfileImage}
                src={profilePreview}
                round
                width={96}
                height={96}
                alt="Profile preview"
              />
              {profilePreviewLabel ? (
                <small className="data-table__muted" style={{ display: "block", marginTop: 6 }}>
                  {profilePreviewLabel}
                </small>
              ) : null}
            </div>
          ) : null}
        </label>
        {form.type === "link" ? (
          <label className="user-field col-12">
            <span className="user-field__label">
              YouTube link <span className="required-dot">*</span>
            </span>
            <input
              className="user-field__input"
              maxLength={YTLINK_MAX_LEN}
              value={form.ytLink}
              onChange={(e) => setForm((p) => ({ ...p, ytLink: e.target.value }))}
              required
            />
          </label>
        ) : null}
        {form.type === "video" ? (
          <label className="user-field col-12">
            <span className="user-field__label">
              Video file (up to 25 MB){" "}
              {editId ? "(optional — keep empty to retain current)" : <span className="required-dot">*</span>}
            </span>
            <input
              ref={videoFileInputRef}
              className="user-field__input"
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.m4v"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > VIDEO_MAX_SIZE_BYTES) {
                  setVideoFile(null);
                  setVideoFileName(editBaselineVideo ? String(editBaselineVideo).split("/").pop() : "");
                  revokeVideoPreviewBlob();
                  setVideoPreview(editBaselineVideo ? mediaUrl(editBaselineVideo) : "");
                  e.target.value = "";
                  void Swal.fire({
                    icon: "error",
                    title: "Validation error",
                    text: "Video size must be 25 MB or less.",
                  });
                  return;
                }
                setVideoFile(file);
                if (file) {
                  revokeVideoPreviewBlob();
                  const url = URL.createObjectURL(file);
                  videoPreviewBlobRef.current = url;
                  setVideoPreview(url);
                  setVideoFileName(file.name);
                } else {
                  revokeVideoPreviewBlob();
                  setVideoPreview(editBaselineVideo ? mediaUrl(editBaselineVideo) : "");
                  setVideoFileName(editBaselineVideo ? String(editBaselineVideo).split("/").pop() : "");
                }
              }}
            />
            <small className="data-table__muted" style={{ display: "block", marginTop: 4 }}>
              {videoFileName || "No video selected"}
            </small>
            {videoPreview ? (
              <div style={{ marginTop: 12 }}>
                <video
                  key={videoPreview}
                  src={videoPreview}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    width: "100%",
                    maxWidth: 560,
                    maxHeight: 320,
                    borderRadius: 8,
                    display: "block",
                    background: "#000",
                  }}
                />
                {videoPreviewLabel ? (
                  <small className="data-table__muted" style={{ display: "block", marginTop: 6 }}>
                    {videoPreviewLabel}
                  </small>
                ) : null}
              </div>
            ) : null}
          </label>
        ) : null}
      </div>
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/video-testimonials")}>
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

export function VideoTestimonialAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create video testimonial</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/video-testimonials")}>
            Back to list
          </button>
        </div>
        <VideoTestimonialForm mode="create" />
      </div>
    </div>
  );
}
