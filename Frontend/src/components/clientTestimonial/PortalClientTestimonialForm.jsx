import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { AdminMediaImage } from "../../admin/components/AdminMediaImage.jsx";
import {
  DESCRIPTION_MAX_LEN,
  sanitizeMultiLine,
} from "../../admin/pages/clientTestimonial/ClientTestimonialShared.js";

export function PortalClientTestimonialForm({
  token,
  onUnauthorized,
  basePath,
  updateTestimonial,
  initialTestimonial = null,
}) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    rating: String(initialTestimonial?.rating ?? 5),
    description: initialTestimonial?.description || "",
    status: initialTestimonial?.status || "inactive",
  }));
  const editId = initialTestimonial?._id || initialTestimonial?.id || "";

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token || !editId) return;

    const description = sanitizeMultiLine(form.description, DESCRIPTION_MAX_LEN).trim();
    const rating = Number(form.rating);

    if (!description) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Description is required." });
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Rating must be between 1 and 5." });
      return;
    }

    setSaving(true);
    try {
      await updateTestimonial(token, editId, {
        description,
        rating,
        status: form.status || "inactive",
      });
      await Swal.fire({ icon: "success", title: "Client testimonial updated", timer: 1500 });
      navigate(basePath);
    } catch (err) {
      if (err?.status === 401) return onUnauthorized?.();
      await Swal.fire({
        icon: "error",
        title: "Save failed",
        text: err.message || "Could not save client testimonial.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <p className="page-card__desc" style={{ marginBottom: 12 }}>
        Name and profile image come from the user account and cannot be edited here.
        {initialTestimonial?.userId ? (
          <>
            {" "}
            User ID: <code>{initialTestimonial.userId}</code>
          </>
        ) : null}
      </p>
      <div className="row g-3">
        <div className="user-field col-12 col-md-6">
          <span className="user-field__label">Name</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <AdminMediaImage
              path={initialTestimonial?.profileImage}
              round
              width={56}
              height={56}
              alt={initialTestimonial?.name || "Profile"}
            />
            <span>{initialTestimonial?.name || "—"}</span>
          </div>
        </div>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Rating <span className="required-dot">*</span>
          </span>
          <select
            className="user-field__input"
            value={form.rating}
            onChange={(e) => setForm((p) => ({ ...p, rating: e.target.value }))}
            required
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Public status</span>
          <select
            className="user-field__input"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="active">Active (public)</option>
            <option value="inactive">Inactive (hidden)</option>
          </select>
        </label>
        <label className="user-field col-12">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Description <span className="required-dot">*</span>
            </span>
            <small>
              {form.description.length}/{DESCRIPTION_MAX_LEN}
            </small>
          </span>
          <textarea
            className="user-field__input"
            rows={3}
            maxLength={DESCRIPTION_MAX_LEN}
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: sanitizeMultiLine(e.target.value, DESCRIPTION_MAX_LEN) }))
            }
            required
          />
        </label>
      </div>
      <div className="user-form__actions">
        <button type="button" className="btn btn--ghost" onClick={() => navigate(basePath)}>
          Cancel edit
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving || !editId}>
          {saving ? "Saving…" : "Update"}
        </button>
      </div>
    </form>
  );
}
