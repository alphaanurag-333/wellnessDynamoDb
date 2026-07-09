import { useRef, useState } from "react";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateProgramTestimonial,
  adminUpdateProgramTestimonial,
} from "../../api/programTestimonials.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";
import {
  DESCRIPTION_MAX_LEN,
  IMAGE_MAX_SIZE_BYTES,
  NAME_MAX_LEN,
  TYPE_OPTIONS,
  emptyForm,
  sanitizeMultiLine,
  sanitizeSingleLine,
} from "./ProgramTestimonialShared.js";

export function ProgramTestimonialForm({ mode = "create", initialTestimonial = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialTestimonial) return emptyForm();
    return {
      name: initialTestimonial.name || "",
      description: initialTestimonial.description || "",
      type: initialTestimonial.type || "diabetes_reversal",
      status: initialTestimonial.status || "active",
    };
  });
  const editId = isEditMode && initialTestimonial ? initialTestimonial._id || initialTestimonial.id || "" : "";
  const editBaselineProfileImage = isEditMode && initialTestimonial ? initialTestimonial.profileImage || "" : "";
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(() =>
    isEditMode && initialTestimonial?.profileImage ? mediaUrl(initialTestimonial.profileImage) : ""
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
    if (!form.type) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Type is required." });
      return;
    }

    const payload = {
      name,
      description,
      type: form.type,
      file: profileFile,
      status: form.status || "active",
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateProgramTestimonial(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Program testimonial updated", timer: 1500 });
      } else {
        await adminCreateProgramTestimonial(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Program testimonial created", timer: 1500 });
      }
      navigate("/admin/program-testimonials");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save program testimonial." });
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
            Type <span className="required-dot">*</span>
          </span>
          <select className="user-field__input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} required>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/program-testimonials")}>
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

export function ProgramTestimonialAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create program testimonial"
        subtitle="Add a testimonial for a wellness program category."
        backTo="/admin/program-testimonials"
      />
      <div className="page-card">
        <ProgramTestimonialForm mode="create" />
      </div>
    </div>
  );
}
