import { useRef, useState } from "react";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { IoSendOutline } from "react-icons/io5";
import {
  adminCreateCelebrationBanner,
  adminUpdateCelebrationBanner,
} from "../../api/celebrationController.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";
import {
  IMAGE_MAX_SIZE_BYTES,
  TITLE_MAX_LEN,
  TYPE_OPTIONS,
  emptyForm,
  pillBarStyle,
  pillButtonStyle,
  sanitizeTitleInput,
} from "./CelebrationBannerShared.js";
import { celebrationTypeIcon } from "./CelebrationBannerIcons.jsx";

export function CelebrationBannerForm({ mode = "create", initialBanner = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [formType, setFormType] = useState(() => initialBanner?.type || "birthday");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialBanner) return emptyForm("birthday");
    return {
      title: initialBanner.title || "",
      type: initialBanner.type || "birthday",
      status: initialBanner.status || "active",
      startDate: initialBanner.startDate || "",
      endDate: initialBanner.endDate || "",
    };
  });
  const editId = isEditMode && initialBanner ? initialBanner._id || initialBanner.id || "" : "";
  const editBaselineImage = isEditMode && initialBanner ? initialBanner.image || "" : "";
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(() =>
    isEditMode && initialBanner?.image ? mediaUrl(initialBanner.image) : ""
  );
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setForm(emptyForm(formType));
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const title = sanitizeTitleInput(form.title).trim();
    if (!title) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Title is required." });
      return;
    }
    if (!editId && !(imageFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Banner image is required." });
      return;
    }

    const payload = {
      title,
      type: form.type || "birthday",
      status: form.status || "active",
      startDate: String(form.startDate || "").trim(),
      endDate: String(form.endDate || "").trim(),
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateCelebrationBanner(adminToken, editId, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Celebration banner updated", timer: 1500 });
      } else {
        await adminCreateCelebrationBanner(adminToken, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Celebration banner created", timer: 1500 });
      }
      navigate("/admin/celebration-banners");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...pillBarStyle, gridTemplateColumns: `repeat(${TYPE_OPTIONS.length}, minmax(0, 1fr))` }}>
        {TYPE_OPTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setFormType(item.value);
              setForm((p) => ({ ...p, type: item.value }));
            }}
            style={pillButtonStyle(formType === item.value)}
          >
            {celebrationTypeIcon(item.value)}
            {item.label}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit}>
        <div className="row g-3">
          <label className="user-field col-12 col-md-6">
            <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>
                Title <span className="required-dot">*</span>
              </span>
              <small>
                {form.title.length}/{TITLE_MAX_LEN}
              </small>
            </span>
            <input
              className="user-field__input"
              value={form.title}
              maxLength={TITLE_MAX_LEN}
              onChange={(e) => setForm((p) => ({ ...p, title: sanitizeTitleInput(e.target.value) }))}
              required
            />
          </label>
          <label className="user-field col-12 col-md-6">
            <span className="user-field__label">Status</span>
            <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="user-field col-12 col-md-6">
            <span className="user-field__label">Start date</span>
            <input className="user-field__input" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          </label>
          <label className="user-field col-12 col-md-6">
            <span className="user-field__label">End date</span>
            <input className="user-field__input" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
          </label>
          <label className="user-field col-12 col-md-6">
            <span className="user-field__label">
              Image (up to 5 MB) {editId ? "(optional)" : <span className="required-dot">*</span>}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="user-field__input"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > IMAGE_MAX_SIZE_BYTES) {
                  setImageFile(null);
                  setImagePreview(editBaselineImage ? mediaUrl(editBaselineImage) : "");
                  e.target.value = "";
                  void Swal.fire({ icon: "error", title: "Validation error", text: "Image size must be 5 MB or less." });
                  return;
                }
                setImageFile(file);
                setImagePreview(file ? URL.createObjectURL(file) : editBaselineImage ? mediaUrl(editBaselineImage) : "");
              }}
            />
          </label>
        </div>
        <div style={{ marginTop: 6 }}>
          <AdminMediaImage path={editBaselineImage} src={imagePreview || undefined} width={100} height={60} radius={8} alt="Preview" />
        </div>
        <div className="user-form__actions">
          {isEditMode ? (
            <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/celebration-banners")}>
              Cancel edit
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={resetForm}>
              Reset
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={saving}>
            <IoSendOutline size={16} />
            {saving ? "Saving…" : editId ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CelebrationBannerAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create celebration banner</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/celebration-banners")}>
            Back to list
          </button>
        </div>
        <CelebrationBannerForm mode="create" />
      </div>
    </div>
  );
}
