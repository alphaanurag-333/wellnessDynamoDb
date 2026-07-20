import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateRealPeopleTestimonial,
  adminUpdateRealPeopleTestimonial,
} from "../../api/realPeopleTestimonials.js";
import { adminListHealthConcerns } from "../../api/adminHealthConcerns.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { AdminImagePicker, ADMIN_IMAGE_PRESETS } from "../../components/AdminImagePicker.jsx";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";
import {
  NAME_MAX_LEN,
  REVIEW_MAX_LEN,
  REVIEW_MIN_LEN,
  emptyForm,
  sanitizeReview,
  sanitizeSingleLine,
} from "./RealPeopleTestimonialShared.js";

export function RealPeopleTestimonialForm({ mode = "create", initial = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [healthConcerns, setHealthConcerns] = useState([]);
  const [form, setForm] = useState(() => {
    if (!initial) return emptyForm();
    return {
      name: initial.name || initial.userName || "",
      stars: String(initial.stars ?? initial.rating ?? 5),
      review: initial.review || initial.content || "",
      healthConcernId: initial.healthConcernId || initial.healthConcern?.id || "",
      status: initial.status || "active",
    };
  });
  const editId = isEditMode && initial ? initial._id || initial.id || "" : "";
  const editBaselineProfileImage =
    isEditMode && initial ? initial.profileImage || initial.userAvatar || "" : "";
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(() =>
    isEditMode && (initial?.profileImage || initial?.userAvatar)
      ? mediaUrl(initial.profileImage || initial.userAvatar)
      : ""
  );
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!adminToken) return;
    let cancelled = false;
    (async () => {
      try {
        const { healthConcerns: rows } = await adminListHealthConcerns(adminToken, {
          status: "active",
          limit: 200,
        });
        if (!cancelled) setHealthConcerns(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (err?.status === 401) dispatch(logout());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch]);

  const resetForm = () => {
    setForm(emptyForm());
    setProfileFile(null);
    setProfilePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const name = sanitizeSingleLine(form.name, NAME_MAX_LEN).trim();
    const review = sanitizeReview(form.review, REVIEW_MAX_LEN).trim();
    const stars = Number(form.stars);
    const healthConcernId = String(form.healthConcernId || "").trim();

    if (!name) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Name is required." });
      return;
    }
    if (!healthConcernId) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Health concern is required." });
      return;
    }
    if (!review || review.length < REVIEW_MIN_LEN) {
      await Swal.fire({
        icon: "error",
        title: "Validation error",
        text: `Review must be at least ${REVIEW_MIN_LEN} characters.`,
      });
      return;
    }
    if (!editId && !(profileFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Profile image is required." });
      return;
    }
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Stars must be between 1 and 5." });
      return;
    }

    const payload = {
      name,
      review,
      stars,
      healthConcernId,
      file: profileFile,
      status: form.status || "active",
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateRealPeopleTestimonial(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Testimonial updated", timer: 1500 });
      } else {
        await adminCreateRealPeopleTestimonial(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Testimonial created", timer: 1500 });
      }
      navigate("/admin/real-people-testimonials");
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
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Name <span className="required-dot">*</span>
            </span>
            <small>
              {form.name.length}/{NAME_MAX_LEN}
            </small>
          </span>
          <input
            className="user-field__input"
            value={form.name}
            maxLength={NAME_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, name: sanitizeSingleLine(e.target.value, NAME_MAX_LEN) }))}
            required
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Rating stars <span className="required-dot">*</span>
          </span>
          <select
            className="user-field__input"
            value={form.stars}
            onChange={(e) => setForm((p) => ({ ...p, stars: e.target.value }))}
            required
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>
                {n} star{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
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
              <option key={c._id || c.id} value={c._id || c.id}>
                {c.title}
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
        <label className="user-field col-12">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Review <span className="required-dot">*</span>
            </span>
            <small>
              {form.review.length}/{REVIEW_MAX_LEN}
            </small>
          </span>
          <textarea
            className="user-field__input"
            rows={4}
            maxLength={REVIEW_MAX_LEN}
            value={form.review}
            onChange={(e) => setForm((p) => ({ ...p, review: sanitizeReview(e.target.value, REVIEW_MAX_LEN) }))}
            required
          />
        </label>
        <div className="user-field col-12 col-md-6">
          <AdminImagePicker
            label="Profile image"
            hint="Square portrait for the testimonial card. Crop to 400 × 400px after selecting."
            required={!editId}
            optionalLabel={Boolean(editId)}
            outputWidth={ADMIN_IMAGE_PRESETS.profile.width}
            outputHeight={ADMIN_IMAGE_PRESETS.profile.height}
            previewMaxWidth={ADMIN_IMAGE_PRESETS.profile.previewMaxWidth}
            previewRound={ADMIN_IMAGE_PRESETS.profile.round}
            cropTitle="Crop profile image"
            file={profileFile}
            previewUrl={profilePreview}
            baselinePath={editBaselineProfileImage}
            inputRef={fileInputRef}
            onChange={({ file, previewUrl }) => {
              setProfileFile(file);
              setProfilePreview(previewUrl);
            }}
          />
        </div>
      </div>
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/real-people-testimonials")}>
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

export function RealPeopleTestimonialAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create real people testimonial"
        subtitle="Add a healing story for the Real People : Real Healing section."
        backTo="/admin/real-people-testimonials"
      />
      <div className="page-card">
        <RealPeopleTestimonialForm mode="create" />
      </div>
    </div>
  );
}
