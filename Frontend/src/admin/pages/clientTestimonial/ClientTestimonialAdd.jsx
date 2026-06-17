import { useRef, useState } from "react";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateClientTestimonial,
  adminUpdateClientTestimonial,
} from "../../api/clientTestimonialsController.js";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";
import {
  DESCRIPTION_MAX_LEN,
  IMAGE_MAX_SIZE_BYTES,
  NAME_MAX_LEN,
  emptyForm,
  sanitizeMultiLine,
  sanitizeSingleLine,
} from "./ClientTestimonialShared.js";

export function ClientTestimonialForm({ mode = "create", initialTestimonial = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialTestimonial) return emptyForm();
    return {
      name: initialTestimonial.name || "",
      rating: String(initialTestimonial.rating ?? 5),
      description: initialTestimonial.description || "",
      status: initialTestimonial.status || "active",
    };
  });
  const editId = isEditMode && initialTestimonial ? initialTestimonial._id || initialTestimonial.id || "" : "";
  const editBaselineProfileImage = isEditMode && initialTestimonial ? initialTestimonial.profile_image || "" : "";
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(() =>
    isEditMode && initialTestimonial?.profile_image ? mediaUrl(initialTestimonial.profile_image) : ""
  );
  const fileInputRef = useRef(null);

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
    const description = sanitizeMultiLine(form.description, DESCRIPTION_MAX_LEN).trim();
    const rating = Number(form.rating);

    if (!name) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Name is required." });
      return;
    }
    if (!description) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Description is required." });
      return;
    }
    if (!editId && !(profileFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Profile image is required." });
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Rating must be between 1 and 5." });
      return;
    }

    const payload = { name, description, rating, file: profileFile, status: form.status || "active" };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateClientTestimonial(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Client testimonial updated", timer: 1500 });
      } else {
        await adminCreateClientTestimonial(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Client testimonial created", timer: 1500 });
      }
      navigate("/admin/client-testimonials");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save client testimonial." });
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
            <small>{form.name.length}/{NAME_MAX_LEN}</small>
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
            Rating <span className="required-dot">*</span>
          </span>
          <select className="user-field__input" value={form.rating} onChange={(e) => setForm((p) => ({ ...p, rating: e.target.value }))} required>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Description <span className="required-dot">*</span>
            </span>
            <small>{form.description.length}/{DESCRIPTION_MAX_LEN}</small>
          </span>
          <textarea
            className="user-field__input"
            rows={3}
            maxLength={DESCRIPTION_MAX_LEN}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: sanitizeMultiLine(e.target.value, DESCRIPTION_MAX_LEN) }))}
            required
          />
        </label>
        <label className="user-field col-12">
          <span className="user-field__label">
            Upload profile image (up to 5 MB){" "}
            {editId ? "(optional — leave unchanged to keep current)" : <span className="required-dot">*</span>}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="user-field__input"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file && file.size > IMAGE_MAX_SIZE_BYTES) {
                setProfileFile(null);
                setProfilePreview(editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : "");
                e.target.value = "";
                void Swal.fire({ icon: "error", title: "Validation error", text: "Image size must be 5 MB or less." });
                return;
              }
              setProfileFile(file);
              setProfilePreview(
                file ? URL.createObjectURL(file) : editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : ""
              );
            }}
          />
        </label>
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
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/client-testimonials")}>
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

export function ClientTestimonialAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create client testimonial</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/client-testimonials")}>
            Back to list
          </button>
        </div>
        <ClientTestimonialForm mode="create" />
      </div>
    </div>
  );
}
