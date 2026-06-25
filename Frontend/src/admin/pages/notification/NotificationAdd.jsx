import { useRef, useState } from "react";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { IoSendOutline } from "react-icons/io5";
import { adminCreateNotification, adminUpdateNotification } from "../../api/notificationController.js";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";
import {
  IMAGE_MAX_SIZE_BYTES,
  MESSAGE_MAX_LEN,
  NOTIFICATION_AUDIENCE,
  emptyForm,
  sanitizeMessageInput,
} from "./NotificationShared.js";

export function NotificationForm({ mode = "create", initialNotification = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialNotification) return emptyForm();
    return {
      audienceType: NOTIFICATION_AUDIENCE,
      message: initialNotification.message || "",
      status: initialNotification.status || "active",
    };
  });
  const editId = isEditMode && initialNotification ? initialNotification._id || initialNotification.id || "" : "";
  const editBaselineImage = isEditMode && initialNotification ? initialNotification.image || "" : "";
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(() =>
    isEditMode && initialNotification?.image ? mediaUrl(initialNotification.image) : ""
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

    const message = sanitizeMessageInput(form.message).trim();
    if (!message) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Notification message is required." });
      return;
    }

    const payload = {
      audienceType: NOTIFICATION_AUDIENCE,
      message,
      status: form.status || "active",
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateNotification(adminToken, editId, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Notification updated", timer: 1500 });
      } else {
        await adminCreateNotification(adminToken, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Notification created", timer: 1500 });
      }
      navigate("/admin/notifications");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save notification." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <label className="user-field col-12">
          <span className="user-field__label">
            Notification message <span className="required-dot">*</span>
          </span>
          <textarea
            className="user-field__input"
            rows={3}
            value={form.message}
            maxLength={MESSAGE_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, message: sanitizeMessageInput(e.target.value) }))}
            placeholder="Enter your message for users..."
            required
          />
          <small className="data-table__muted">
            {form.message.length}/{MESSAGE_MAX_LEN}
          </small>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Image (up to 5 MB, optional)</span>
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
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/notifications")}>
            Cancel edit
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={resetForm}>
            Reset
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          <IoSendOutline size={16} />
          {saving ? "Saving…" : editId ? "Update notification" : "Save notification"}
        </button>
      </div>
    </form>
  );
}

export function NotificationAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create notification</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/notifications")}>
            Back to list
          </button>
        </div>
        <NotificationForm mode="create" />
      </div>
    </div>
  );
}
