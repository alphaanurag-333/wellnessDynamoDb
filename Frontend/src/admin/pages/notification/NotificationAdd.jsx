import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { IoSendOutline } from "react-icons/io5";
import { adminCreateNotification, adminUpdateNotification } from "../../api/notificationController.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { AdminImagePicker, ADMIN_IMAGE_PRESETS } from "../../components/AdminImagePicker.jsx";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";
import {
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
        <div className="user-field col-12 col-md-6">
          <AdminImagePicker
            label="Notification image"
            hint="Optional wide image for the notification. Crop to 800 × 480px after selecting."
            optionalLabel={Boolean(editId)}
            outputWidth={ADMIN_IMAGE_PRESETS.notification.width}
            outputHeight={ADMIN_IMAGE_PRESETS.notification.height}
            previewMaxWidth={ADMIN_IMAGE_PRESETS.notification.previewMaxWidth}
            cropTitle="Crop notification image"
            file={imageFile}
            previewUrl={imagePreview}
            baselinePath={editBaselineImage}
            inputRef={fileInputRef}
            onChange={({ file, previewUrl }) => {
              setImageFile(file);
              setImagePreview(previewUrl);
            }}
          />
        </div>
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
          {saving ? "Saving…" : editId ? "Update notification" : "Save notification"}
          <IoSendOutline size={16} />
        </button>
      </div>
    </form>
  );
}

export function NotificationAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create notification"
        subtitle="Send a new push notification to your users."
        backTo="/admin/notifications"
      />
      <div className="page-card">
        <NotificationForm mode="create" />
      </div>
    </div>
  );
}
