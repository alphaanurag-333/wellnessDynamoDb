import { useRef, useState } from "react";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateSupplement, adminUpdateSupplement } from "../../api/adminSupplements.js";
import { logout } from "../../../store/authSlice.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { mediaUrl } from "../../../media.js";
import {
  DESCRIPTION_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  IMAGE_MAX_SIZE_BYTES,
  NAME_MAX_LEN,
  NAME_MIN_LEN,
  UNIT_MAX_LEN,
  UNIT_OPTIONS,
  emptyForm,
  isAllowedSupplementImageFile,
  sanitizeDescription,
  sanitizeName,
  sanitizeNumber,
  validateForm,
} from "./SupplementShared.js";

export function SupplementForm({ mode = "create", initialSupplement = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialSupplement) return emptyForm();
    return {
      name: initialSupplement.name || "",
      description: initialSupplement.description || "",
      packSize: initialSupplement.packSize != null ? String(initialSupplement.packSize) : "",
      unit: initialSupplement.unit || "Caps",
      price: initialSupplement.price != null ? String(initialSupplement.price) : "",
      status: initialSupplement.status || "active",
    };
  });
  const editId = isEditMode && initialSupplement ? initialSupplement._id || initialSupplement.id || "" : "";
  const editBaselineImage = isEditMode && initialSupplement ? initialSupplement.image || "" : "";
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(() =>
    isEditMode && initialSupplement?.image ? mediaUrl(initialSupplement.image) : ""
  );
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setForm(emptyForm());
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const validationError = validateForm(form, {
      editId,
      imageFile,
      hasExistingImage: Boolean(editBaselineImage && String(editBaselineImage).trim()),
    });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      packSize: form.packSize,
      unit: form.unit,
      price: form.price,
      status: form.status || "active",
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateSupplement(adminToken, editId, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Supplement updated", timer: 1500 });
      } else {
        await adminCreateSupplement(adminToken, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Supplement created", timer: 1500 });
      }
      navigate("/admin/supplements");
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
            Name <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: sanitizeName(e.target.value) }))}
            minLength={NAME_MIN_LEN}
            maxLength={NAME_MAX_LEN}
            required
          />
          <small className="data-table__muted">
            {form.name.trim().length}/{NAME_MAX_LEN} (min {NAME_MIN_LEN})
          </small>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Pack size <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.packSize}
            inputMode="numeric"
            onChange={(e) => setForm((p) => ({ ...p, packSize: sanitizeNumber(e.target.value) }))}
            placeholder="60"
            required
          />
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Unit <span className="required-dot">*</span>
          </span>
          <select
            className="user-field__input"
            value={form.unit}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value.slice(0, UNIT_MAX_LEN) }))}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Price (Rs.) <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.price}
            inputMode="decimal"
            onChange={(e) => setForm((p) => ({ ...p, price: sanitizeNumber(e.target.value) }))}
            placeholder="1200"
            required
          />
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
        <label className="user-field col-12">
          <span className="user-field__label">
            Image (up to 5 MB){" "}
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
                if (!isAllowedSupplementImageFile(file)) {
                  setImageFile(null);
                  setImagePreview(editBaselineImage ? mediaUrl(editBaselineImage) : "");
                  e.target.value = "";
                  void Swal.fire({ icon: "error", title: "Invalid file", text: "Use JPEG, PNG, GIF, or WebP only." });
                  return;
                }
                if (file.size > IMAGE_MAX_SIZE_BYTES) {
                  setImageFile(null);
                  setImagePreview(editBaselineImage ? mediaUrl(editBaselineImage) : "");
                  e.target.value = "";
                  void Swal.fire({ icon: "error", title: "Validation error", text: "Image must be 5 MB or less." });
                  return;
                }
              }
              setImageFile(file);
              setImagePreview(file ? URL.createObjectURL(file) : editBaselineImage ? mediaUrl(editBaselineImage) : "");
            }}
          />
        </label>
      </div>
      {imagePreview ? (
        <div style={{ marginTop: 10 }}>
          <AdminMediaImage path={editBaselineImage} src={imagePreview || undefined} width={72} height={72} radius={8} alt="" />
        </div>
      ) : null}
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/supplements")}>
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

export function SupplementAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create supplement"
        subtitle="Add a new supplement to your catalog."
        backTo="/admin/supplements"
      />
      <div className="page-card">
        <SupplementForm mode="create" />
      </div>
    </div>
  );
}
