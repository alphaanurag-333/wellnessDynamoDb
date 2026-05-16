import { useEffect, useRef, useState } from "react";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateVideoTestimonial,
  adminUpdateVideoTestimonial,
} from "../../api/videoTestimonialsController.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";
import {
  IMAGE_MAX_SIZE_BYTES,
  NAME_MAX_LEN,
  TYPE_OPTIONS,
  VIDEO_MAX_SIZE_BYTES,
  YTLINK_MAX_LEN,
  emptyForm,
} from "./VideoTestimonialShared.js";

export function VideoTestimonialForm({ mode = "create", initialTestimonial = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialTestimonial) return emptyForm();
    return {
      name: initialTestimonial.name || "",
      type: initialTestimonial.type || "link",
      ytLink: initialTestimonial.ytLink || "",
      video: initialTestimonial.video || "",
      profile_image: initialTestimonial.profile_image || "",
      status: initialTestimonial.status || "active",
    };
  });
  const editId = isEditMode && initialTestimonial ? initialTestimonial._id || initialTestimonial.id || "" : "";
  const editBaselineVideo = isEditMode && initialTestimonial ? initialTestimonial.video || "" : "";
  const editBaselineProfileImage = isEditMode && initialTestimonial ? initialTestimonial.profile_image || "" : "";
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileName, setVideoFileName] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(() =>
    isEditMode && initialTestimonial?.profile_image ? mediaUrl(initialTestimonial.profile_image) : ""
  );
  const videoFileInputRef = useRef(null);
  const profileFileInputRef = useRef(null);

  useEffect(() => {
    if (form.type === "link") {
      setVideoFile(null);
      setVideoFileName("");
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
      setForm((p) => ({ ...p, video: "" }));
    } else if (form.type === "video") {
      setForm((p) => ({ ...p, ytLink: "" }));
    }
  }, [form.type]);

  const resetForm = () => {
    setForm(emptyForm());
    setVideoFile(null);
    setVideoFileName("");
    setProfileImageFile(null);
    setProfilePreview("");
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
          <span className="user-field__label">
            Upload profile image (up to 5 MB){" "}
            {editId ? "(optional — leave unchanged to keep current)" : <span className="required-dot">*</span>}
          </span>
          <input
            ref={profileFileInputRef}
            className="user-field__input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file && file.size > IMAGE_MAX_SIZE_BYTES) {
                setProfileImageFile(null);
                setProfilePreview(editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : "");
                e.target.value = "";
                void Swal.fire({ icon: "error", title: "Validation error", text: "Profile image must be 5 MB or less." });
                return;
              }
              setProfileImageFile(file);
              setProfilePreview(
                file ? URL.createObjectURL(file) : editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : ""
              );
            }}
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Type</span>
          <select className="user-field__input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="link">Link</option>
            <option value="video">Video</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
              Upload video file (up to 50 MB){" "}
              {editId ? "(optional — leave unchanged to keep current)" : <span className="required-dot">*</span>}
            </span>
            <input
              ref={videoFileInputRef}
              className="user-field__input"
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > VIDEO_MAX_SIZE_BYTES) {
                  setVideoFile(null);
                  setVideoFileName("");
                  e.target.value = "";
                  void Swal.fire({ icon: "error", title: "Validation error", text: "Video size must be 50 MB or less." });
                  return;
                }
                setVideoFile(file);
                setVideoFileName(file ? file.name : "");
              }}
            />
            {videoFileName ? (
              <small className="data-table__muted">{videoFileName}</small>
            ) : editBaselineVideo ? (
              <small className="data-table__muted">Current video on file</small>
            ) : null}
          </label>
        ) : null}
      </div>
      {(profilePreview || editBaselineProfileImage) ? (
        <div style={{ marginTop: 10 }}>
          <AdminMediaImage
            path={editBaselineProfileImage}
            src={profilePreview || undefined}
            round
            width={72}
            height={72}
            alt="Profile preview"
          />
        </div>
      ) : null}
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
