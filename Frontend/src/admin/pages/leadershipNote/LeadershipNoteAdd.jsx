import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateLeadershipNote,
  adminUpdateLeadershipNote,
} from "../../api/leadershipNotesController.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { AdminImagePicker, ADMIN_IMAGE_PRESETS } from "../../components/AdminImagePicker.jsx";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";
import {
  BADGE_MAX_LEN,
  DEFAULT_BADGE,
  DESIGNATION_MAX_LEN,
  MESSAGE_MAX_LEN,
  NAME_MAX_LEN,
  TITLE_MAX_LEN,
  emptyForm,
  sanitizeMessage,
  sanitizeSingleLine,
} from "./LeadershipNoteShared.js";

export function LeadershipNoteForm({ mode = "create", initialNote = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialNote) return emptyForm();
    return {
      name: initialNote.name || "",
      designation: initialNote.designation || "",
      title: initialNote.title || "",
      badge: initialNote.badge || DEFAULT_BADGE,
      message: initialNote.message || "",
      status: initialNote.status || "active",
    };
  });
  const editId = isEditMode && initialNote ? initialNote._id || initialNote.id || "" : "";
  const editBaselineProfileImage = isEditMode && initialNote ? initialNote.profileImage || "" : "";
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(() =>
    isEditMode && initialNote?.profileImage ? mediaUrl(initialNote.profileImage) : ""
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
    const designation = sanitizeSingleLine(form.designation, DESIGNATION_MAX_LEN).trim();
    const title = sanitizeSingleLine(form.title, TITLE_MAX_LEN).trim();
    const badge = sanitizeSingleLine(form.badge, BADGE_MAX_LEN).trim() || DEFAULT_BADGE;
    const message = sanitizeMessage(form.message, MESSAGE_MAX_LEN).trim();

    if (!name) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Name is required." });
      return;
    }
    if (!designation) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Designation is required." });
      return;
    }
    if (!message) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Message is required." });
      return;
    }
    if (!editId && !(profileFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Profile image is required." });
      return;
    }

    const payload = {
      name,
      designation,
      title: title || designation,
      badge,
      message,
      file: profileFile,
      status: form.status || "active",
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateLeadershipNote(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Leadership note updated", timer: 1500 });
      } else {
        await adminCreateLeadershipNote(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Leadership note created", timer: 1500 });
      }
      navigate("/admin/leadership-notes");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save leadership note." });
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
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Designation <span className="required-dot">*</span>
            </span>
            <small>
              {form.designation.length}/{DESIGNATION_MAX_LEN}
            </small>
          </span>
          <input
            className="user-field__input"
            value={form.designation}
            maxLength={DESIGNATION_MAX_LEN}
            onChange={(e) =>
              setForm((p) => ({ ...p, designation: sanitizeSingleLine(e.target.value, DESIGNATION_MAX_LEN) }))
            }
            required
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>Title</span>
            <small>
              {form.title.length}/{TITLE_MAX_LEN}
            </small>
          </span>
          <input
            className="user-field__input"
            value={form.title}
            maxLength={TITLE_MAX_LEN}
            placeholder="Defaults to designation"
            onChange={(e) => setForm((p) => ({ ...p, title: sanitizeSingleLine(e.target.value, TITLE_MAX_LEN) }))}
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>Badge</span>
            <small>
              {form.badge.length}/{BADGE_MAX_LEN}
            </small>
          </span>
          <input
            className="user-field__input"
            value={form.badge}
            maxLength={BADGE_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, badge: sanitizeSingleLine(e.target.value, BADGE_MAX_LEN) }))}
          />
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
              Message <span className="required-dot">*</span>
            </span>
            <small>
              {form.message.length}/{MESSAGE_MAX_LEN}
            </small>
          </span>
          <textarea
            className="user-field__input"
            rows={6}
            maxLength={MESSAGE_MAX_LEN}
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: sanitizeMessage(e.target.value, MESSAGE_MAX_LEN) }))}
            required
          />
        </label>
        <div className="user-field col-12 col-md-6">
          <AdminImagePicker
            label="Profile image"
            hint="Square portrait for the leadership card. Crop to 400 × 400px after selecting."
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
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/leadership-notes")}>
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

export function LeadershipNoteAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create leadership note"
        subtitle="Add a leadership message shown on the About page swiper."
        backTo="/admin/leadership-notes"
      />
      <div className="page-card">
        <LeadershipNoteForm mode="create" />
      </div>
    </div>
  );
}
