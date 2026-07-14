import { useCallback, useEffect, useRef, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import {
  adminCreateCofounderMessage,
  adminGetCofounderMessage,
  adminUpdateCofounderMessage,
} from "../../api/cofounderMessageController.js";
import { AdminListHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { useHasPermission } from "../../hooks/useHasPermission.js";
import { mediaUrl } from "../../../media.js";
import {
  IMAGE_MAX_SIZE_BYTES,
  MESSAGE_MAX_LEN,
  NAME_MAX_LEN,
  emptyForm,
  messageFromApi,
} from "./CofounderMessageShared.js";

export function CofounderMessagePage() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const canEdit = useHasPermission("cofounder-message.edit");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [baselineProfileImage, setBaselineProfileImage] = useState("");

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");

  const profileFileInputRef = useRef(null);
  const profilePreviewBlobRef = useRef("");

  const revokeProfilePreviewBlob = () => {
    if (profilePreviewBlobRef.current) {
      URL.revokeObjectURL(profilePreviewBlobRef.current);
      profilePreviewBlobRef.current = "";
    }
  };

  const applyRecord = useCallback((record) => {
    const next = messageFromApi(record);
    setForm(next);
    setBaselineProfileImage(next.profileImage || "");
    setProfileImageFile(null);
    revokeProfilePreviewBlob();
    setProfilePreview(next.profileImage ? mediaUrl(next.profileImage) : "");
    if (profileFileInputRef.current) profileFileInputRef.current.value = "";
  }, []);

  const loadRecord = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const body = await adminGetCofounderMessage(adminToken);
      const record = body?.data ?? null;
      setExists(Boolean(record));
      if (record) {
        applyRecord(record);
      } else {
        setForm(emptyForm());
        setBaselineProfileImage("");
        setProfilePreview("");
      }
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load cofounder message." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, applyRecord, dispatch]);

  useEffect(() => {
    loadRecord();
    return () => {
      revokeProfilePreviewBlob();
    };
  }, [loadRecord]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken || !canEdit) return;

    const payload = {
      name: String(form.name || "").replace(/\s+/g, " ").slice(0, NAME_MAX_LEN).trim(),
      message: String(form.message || "").slice(0, MESSAGE_MAX_LEN).trim(),
      status: String(form.status || "active").trim().toLowerCase(),
      profileImageFile,
    };

    if (!payload.name) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Cofounder name is required." });
      return;
    }
    if (!payload.message) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Message is required." });
      return;
    }
    if (!exists && !(profileImageFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Profile image is required." });
      return;
    }

    setSaving(true);
    try {
      if (exists) {
        await adminUpdateCofounderMessage(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Cofounder message updated", timer: 1500 });
      } else {
        await adminCreateCofounderMessage(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Cofounder message created", timer: 1500 });
      }
      await loadRecord();
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminPageLoader label="Loading cofounder message…" />;
  }

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader title="Cofounder message" />

        <form onSubmit={onSubmit}>
          <div className="row g-3">
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">
                Cofounder name <span className="required-dot">*</span>
              </span>
              <input
                className="user-field__input"
                maxLength={NAME_MAX_LEN}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                disabled={!canEdit}
                readOnly={!canEdit}
              />
            </label>
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">Status</span>
              <select
                className="user-field__input"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                disabled={!canEdit}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="user-field col-12">
              <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>
                  Cofounder message <span className="required-dot">*</span>
                </span>
                <small>
                  {form.message.length}/{MESSAGE_MAX_LEN}
                </small>
              </span>
              <textarea
                className="user-field__input"
                rows={5}
                maxLength={MESSAGE_MAX_LEN}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                required
                disabled={!canEdit}
                readOnly={!canEdit}
              />
            </label>
            {canEdit ? (
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">
                Profile image (up to 25 MB){" "}
                {exists ? "(optional — keep empty to retain current)" : <span className="required-dot">*</span>}
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
                    setProfilePreview(baselineProfileImage ? mediaUrl(baselineProfileImage) : "");
                    e.target.value = "";
                    void Swal.fire({ icon: "error", title: "Validation error", text: "Profile image must be 25 MB or less." });
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
                    setProfilePreview(baselineProfileImage ? mediaUrl(baselineProfileImage) : "");
                  }
                }}
              />
              {profilePreview ? (
                <div style={{ marginTop: 12 }}>
                  <AdminMediaImage
                    path={profileImageFile ? undefined : baselineProfileImage}
                    src={profilePreview}
                    round
                    width={96}
                    height={96}
                    alt="Profile preview"
                  />
                </div>
              ) : null}
            </label>
            ) : profilePreview ? (
              <div className="col-12">
                <AdminMediaImage
                  path={baselineProfileImage}
                  src={profilePreview}
                  round
                  width={96}
                  height={96}
                  alt="Profile preview"
                />
              </div>
            ) : null}
          </div>
          {canEdit ? (
            <div className="user-form__actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? "Saving…" : exists ? "Update message" : "Create message"}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
